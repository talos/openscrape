# -*- coding: utf-8 -*-

"""
Openscrape server.

Store caustic JSON instructions.
"""

try:
    import simplejson as json
    json
except ImportError:
    import json

#import logging
import re
import jsongit

from dictshield.base import ShieldException
from brubeck.request_handling import Brubeck
from brubeck.auth import UserHandlingMixin

from brubeck.templating import MustacheRendering, load_mustache_env
import oauth
from config import DB_NAME, DB_HOST, DB_PORT, COOKIE_SECRET, RECV_SPEC, \
                   SEND_SPEC, JSON_GIT_DIR, TEMPLATE_DIR, VALID_URL_CHARS, \
                   APP_HOST, APP_PORT
import database


class Handler(MustacheRendering, UserHandlingMixin):
    """
    An extended handler.
    """

    def validate_user_name(self, user_name):
        """
        Returns True if the user name is OK, False otherwise.
        """
        return not re.search(r'[^%s]' % VALID_URL_CHARS, user_name)

    def instruction_to_path(self, user_name, instruction_doc):
        """
        Convert an instruction to its path.
        """
        return "/instructions/%s/%s" % (user_name, instruction_doc.name)

    def instruction_paths(self, user_name, instruction_docs):
        """
        Convert a list of instruction documents to a list of their paths.
        """
        return [self.instruction_to_path(user_name, doc) for doc in instruction_docs]

    def get_current_user(self):
        """
        Return the User DictShield model from the database using
        cookie session.  Returns `None` if there is no current user.
        """
        id = self.get_cookie('session', None, self.application.cookie_secret)
        return self.application.users.get(id) if id else None

    def set_current_user(self, user):
        """
        Set the cookie that will be used for session management.
        `user` is a User.
        """
        self.set_cookie('session', user.id, self.application.cookie_secret, path='/')

    def logout_user(self):
        """
        Log out the current user.  Returns None
        """
        self.delete_cookie('session', path='/')

    def is_json_request(self):
        """
        Returns True if this was a request for JSON, False otherwise.
        """
        return self.message.headers.get('accept').rfind('application/json') > -1

#
# HANDLERS
#

class OAuthLogin(Handler):

    def post(self):
        """
        The user wants to log in.  Check they exist, then tell the app to
        redirect them to the appropriate OAuth service for confirmation.

        Returns JSON.
        """
        context = {}
        self.delete_cookie('signup')
        name_or_email = self.get_argument('name_or_email')
        if self.current_user:
            context['error'] = 'You are already logged in as %s' % self.current_user.name
            status = 403
        elif not name_or_email:
            context['error'] = 'You must specify a name or email'
            status = 400
        else:
            user = self.application.users.find(name_or_email)
            if user:
                try:
                    provider = oauth.OAuthProvider(APP_HOST, APP_PORT, user.provider)
                    context['redirect'] = provider.auth_url
                    status = 200
                except oauth.OAuthError as e:
                    context['error'] = "Unexpected OAuth error %s" % e
                    status = 500
            else:
                context['error'] = 'User does not exist'
                status = 403

        self.headers['Content-Type'] = 'application/json'
        self.set_status(status)
        self.set_body(json.dumps(context))
        return self.render()


class OAuthSignup(Handler):

    def post(self):
        """
        The user wants to sign up.  Make sure their username isn't taken, and
        then tell the app to redirect them to their chosen provider.

        Returns JSON.
        """
        user_name = self.get_argument('user')
        provider_name = self.get_argument('provider', '').lower()
        context = { 'user': user_name }

        try:
            provider = oauth.OAuthProvider(APP_HOST, APP_PORT, provider_name)
            if self.current_user:
                context['error'] = 'You are already logged in as %s.' % self.current_user.name
                status = 400
            else:
                if not user_name:
                    context['error'] = 'You must specify user name to sign up'
                    status = 400
                elif not self.validate_user_name(user_name):
                    context['error'] = 'Illegal character in requested user name'
                    status = 400
                elif self.application.users.find(user_name):
                    context['error'] = "User name '%s' is already in use." % user_name
                    status = 400
                else:
                    self.set_cookie('signup', user_name, self.application.cookie_secret)
                    status = 200
                    context['redirect'] = provider.auth_url
        except oauth.OAuthError:
            context['error'] = "OAuth provider %s is not supported." % provider_name
            status = 400

        self.headers['Content-Type'] = 'application/json'
        self.set_status(status)
        self.set_body(json.dumps(context))
        return self.render()


class OAuthCallback(Handler):

    def get(self, provider_name):
        """
        The callback landing from OAuth identification.  This is where we
        distribute cookies and send 'em on home.

        The callback could come from either a standard login or a new signup.
        Must generate users accordingly.

        Returns a posted message.
        """
        code = self.get_argument('code')
        context = {}
        if code:
            try:
                provider = oauth.OAuthProvider(APP_HOST, APP_PORT, provider_name)
                user = provider.new_user(code)

                # state is stored client-side in cookie, which must be
                # revalidated in case of tampering
                signup_name = self.get_cookie('signup', None, self.application.cookie_secret)
                if signup_name:
                    if self.application.users.find(signup_name):
                        context['error'] = 'Someone stole your name while you \
                                OAuth\'d!, sorry.  Try again.'
                        status = 400
                    elif self.validate_user_name(signup_name):
                        user.name = signup_name
                        self.application.users.save_or_create(user)
                        self.set_current_user(user)
                        status = 200
                        context['user'] = user.name
                    else:
                        # they faked something to get here.
                        context['error'] = 'Bad losername, cleva hacka'
                        status = 400
                else:
                    existing_user = self.application.users.find(user.email)
                    if existing_user:
                        # TODO: update existing_user from user
                        self.set_current_user(existing_user)
                        context['user'] = existing_user.name
                        status = 200
                    else:
                        context['error'] = 'You must sign up for an account.'
                        status = 400
            except oauth.OAuthError as e:
                context['error'] = "There was an OAuth error: %s" % e
                status = 500
            except database.ValidationError as e:
                context['error'] = "Your OAuth provider supplied the value \
                        '%s' for '%s', which is not valid." % (e.field_value,
                                                               e.field_name)
                status = 400
            except database.DuplicateError as e:
                context['error'] = "You already have an openscrape account \
                        linked to %s." % provider_name
                status = 400
            except database.DatabaseError as e:
                context['error'] = "Database error: %s" % e
                status = 500

        else:
            context['error'] = "Login failed: no access code from OAuth provider."
            status = 500

        return self.render_template('post_message', _status_code=status, **{
            'message': json.dumps(context)
        })


class OAuthStatus(Handler):

    def get(self):
        """
        Returns a JSON object with user info.
        """
        context = {}
        if self.current_user:
            context['user'] = self.current_user.name
        self.headers['Content-Type'] = 'application/json'
        self.set_body(json.dumps(context))
        return self.render()


class OAuthLogout(Handler):

    def get(self):
        """
        A simple logout -- just clears their cookie.
        """
        self.logout_user()
        return self.redirect('/')


class UserHandler(Handler):

    def get(self, user_name):
        """
        Get all the instructions by this user.
        """
        context = {}
        user = self.application.users.find(user_name)
        if user:
            context['user'] = user.to_json(encode=False)
            status = 200
        else:
            context['error'] = "No user %s" % user_name
            status = 404

        if self.is_json_request():
            self.set_body(json.dumps(context))
            self.set_status(status)
            return self.render()
        else:
            return self.render_template('user', _status_code=status, **context)

        return self.render_template('user', user=user)

    def delete(self, user_name):
        """
        This handler lets a user delete his/her account.  This does not delete
        instructions, but will orphan them.  S/he must match a deletion token.
        """
        context = {}
        if not self.current_user:
            context['error'] = 'You are not signed in.'
            status = 401
        elif self.current_user.name == user_name:
            self.application.users.delete(self.current_user)
            context['destroyed'] = self.current_user.name
            status = 200
        else:
            status = 403
            context['error'] = "You cannot destroy that user."

        if self.is_json_request():
            self.set_body(json.dumps(context))
            self.set_status(status)
            return self.render()
        else:
            return self.render_template('user', _status_code=status, **context)

class InstructionCollectionHandler(Handler):
    """
    This handler provides access to all of a user's instructions.
    """

    def get(self, user_name):
        """
        Provide a listing of all this user's instructions.
        """
        context = { 'user': user_name }
        instructions = self.application.instructions.for_creator(user_name)
        if instructions == None:
            context['error'] = "User %s does not exist." % user_name
            status = 404
        else:
            context['instructions'] = self.instruction_paths(user_name, instructions)
            status = 200

        if self.is_json_request():
            if status == 200:
                context = context['instructions']
            self.set_body(json.dumps(context))
            self.set_status(status)
            return self.render()
        else:
            return self.render_template('instruction_collection',
                                        _status_code=status,
                                        **context)

    def post(self, user_name):
        """
        Allow for cloning and creation.
        """
        context = {}
        user = self.application.users.find(user_name)
        if user != self.current_user:
            context['error'] = 'You cannot modify these resources.'
            status = 403
        else:
            action = self.get_argument('action')
            if action == 'create':
                name = self.get_argument('name')
                if self.application.instructions.find(user_name, name):
                    status = 409
                    context['error'] = "There is already an instruction with that name"
                else:
                    status = 302
                    self.headers['Location'] = name  # they will be able to create it there
            # elif action == 'clone':
            #     owner = self.application.users.find(self.get_argument('owner'))
            #     name = self.get_argument('name')

            #     if not owner:
            #         status = 404
            #         context['error'] = "There is no user %s" % owner
            #     elif name in user.instructions:
            #         status = 409
            #         context['error'] = "You already have an instruction with that name"
            #     elif name in owner.instructions:
            #         user.instructions[name] = owner.instructions[name]
            #         self.db_conn.users.save(user.to_python())
            #         self.repo.create('/'.join(user, name), user.instructions[name])
            #         status = 303 # forward to page for instruction
            #         self.headers['Location'] = name
            #     else:
            #         status = 409
            #         context['error'] = "Could not clone the instruction."
            else:
                context['error'] = 'Unknown action'
                status = 400

        if self.is_json_request():
            self.set_body(json.dumps(context))
            self.set_status(status)
            return self.render()
        else:
            return self.render_template('created', _status_code=status, **context)

class TagCollectionHandler(Handler):
    """
    This handler provides access to all of a user's instructions with a certain
    tag.
    """
    def get(self, user_name, tag):
        context = {'tag': tag, 'user': user_name}
        instructions = self.application.instructions.tagged(user_name, tag)
        if instructions == None:
            status = 404
            context['error'] = "No user %s" % user_name
        else:
            status = 200
            context['instructions'] = self.instruction_paths(user_name, instructions)

        if self.is_json_request():
            if status == 200:
                context = context['instructions']
            self.set_body(json.dumps(context))
            self.set_status(status)
            return self.render()
        else:
            return self.render_template('tagged', _status_code=status, **context)


class InstructionModelHandler(Handler):
    """
    This handler provides clients access to a single instruction by name.
    """

    def get(self, user_name, name):
        """
        Display a single instruction.
        """
        context = {}
        doc = self.application.instructions.find(user_name, name)
        if doc:
            context['instruction'] = doc.to_python()
            status = 200
        else:
            context['error'] = "Instruction does not exist"
            status = 404

        if self.is_json_request():
            if status == 200:
                context = doc.instruction
            self.set_body(json.dumps(context))
            self.set_status(status)
            return self.render()
        else:
            return self.render_template('instruction', _status_code=status, **context)

    def put(self, owner, name):
        """
        Update a single instruction, creating it if it doesn't exist.
        """
        user = self.current_user
        context = {}
        if not user:
            context['error'] = "You are not logged in."
            status = 403
        elif owner != user.name:
            context['error'] = 'This is not your template.'
            status = 403
        else:
            try:
                doc = self.application.instructions.save_or_create(
                    user, name,
                    json.loads(self.get_argument('instruction')),
                    json.loads(self.get_argument('tags')))
                status = 201
                context['instruction'] = doc.to_python()
            except ShieldException as error:
                context['error'] = "Invalid instruction: %s." % error
                status = 400
            except TypeError as error:
                context['error'] = 'Invalid arguments: %s.' % error
                status = 400
            except ValueError as error:
                context['error'] = 'Invalid JSON: %s.' % error
                status = 400

        if self.is_json_request():
            if status == 201:
                context = doc.instruction
            self.set_body(json.dumps(context))
            self.set_status(status)
            return self.render()
        else:
            return self.render_template('instruction', _status_code=status, **context)

    def delete(self, owner, name):
        """
        Delete an instruction.
        """
        user = self.current_user
        context = {}
        if not user:
            context['error'] = 'You are not logged in'
        elif not owner == user.name:
            context['error'] = "You cannot delete someone else's template"
            status = 403
        else:
            instruction = self.application.instructions.find(user, name)
            if instruction:
                self.application.instructions.delete(instruction)
                status = 200
            else:
                status['error'] = "Instruction does not exist"
                status = 404

        if self.is_json_request():
            self.set_body(json.dumps(context))
            self.set_status(status)
            return self.render()
        else:
            return self.render_template('delete_instruction', _status_code=status, **context)

V_C = VALID_URL_CHARS
config = {
    'mongrel2_pair': (RECV_SPEC, SEND_SPEC),
    'handler_tuples': [
        (r'^/oauth/signup$', OAuthSignup),
        (r'^/oauth/login$', OAuthLogin),
        (r'^/oauth/logout$', OAuthLogout),
        (r'^/oauth/callback/([%s]+)$' % V_C, OAuthCallback),
        (r'^/oauth/status$', OAuthStatus),
        (r'^/instructions/([%s]+)$' % V_C, UserHandler),
        (r'^/instructions/([%s]+)/$' % V_C, InstructionCollectionHandler),
        (r'^/instructions/([%s]+)/([%s]+)$' % (V_C, V_C), InstructionModelHandler),
        (r'^/instructions/([%s]+)/([%s]+)/$' % (V_C, V_C), TagCollectionHandler)],
    'template_loader': load_mustache_env(TEMPLATE_DIR),
    'cookie_secret': COOKIE_SECRET,
}

app = Brubeck(**config)
db = database.get_db(DB_HOST, DB_PORT, DB_NAME)
app.users = database.Users(db)
app.instructions = database.Instructions(app.users, jsongit.init(JSON_GIT_DIR), db)
app.run()
