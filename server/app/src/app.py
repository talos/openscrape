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
                   SEND_SPEC, JSONGIT_DIR, TEMPLATE_DIR, VALID_URL_CHARS, \
                   APP_HOST, APP_PORT, CLIENT_LANDING
import database


# Users should not be allowed to make accounts with these names.
RESERVED_WORDS = ['oauth', 'instructions', 'users', 'proxy']

# Not optimal, but the user could conceivably need this file without a redirect
# to nginx possible.
try:
    f = open(CLIENT_LANDING, 'r')
    client_landing = f.read()
finally:
    f.close()

class Handler(MustacheRendering, UserHandlingMixin):
    """
    An extended handler.
    """

    def validate_user_name(self, user_name):
        """
        Returns True if the user name is OK, False otherwise.
        """
        if user_name in RESERVED_WORDS:
            return False
        else:
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
        accept = self.message.headers.get('accept')
        return accept.rfind('application/json') > -1


#
# DECORATORS
#

def json_only(meth):
    """Decorator that ensures method only accepts JSON requests, returns
    406 otherwise.
    """
    # @functools.wraps(meth)
    def wrapped(self, *args, **kwargs):
        if self.is_json_request():
            self.headers['Content-Type'] = 'application/json'
            return meth(self, *args, **kwargs)
        else:
            self.set_body(client_landing)
            return self.render()
    return wrapped


#
# HANDLERS
#

class OAuthLogin(Handler):

    @json_only
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
            context = 'You are already logged in as %s' % self.current_user.name
            status = 403
        elif not name_or_email:
            context = 'You must specify a name or email'
            status = 400
        else:
            user = self.application.users.find(name_or_email)
            if user:
                try:
                    provider = oauth.OAuthProvider(APP_HOST, APP_PORT, user.provider)
                    context['redirect'] = provider.auth_url
                    status = 200
                except oauth.OAuthError as e:
                    context = "Unexpected OAuth error %s" % e
                    status = 500
            else:
                context = 'User does not exist'
                status = 403

        self.set_body(json.dumps(context))
        return self.render(status_code=status)


class OAuthSignup(Handler):

    @json_only
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
                context = 'You are already logged in as %s.' % self.current_user.name
                status = 400
            else:
                if not user_name:
                    context = 'You must specify user name to sign up.'
                    status = 400
                elif not self.validate_user_name(user_name):
                    context = "User name '%s' is invalid." % user_name
                    status = 400
                elif self.application.users.find(user_name):
                    context = "User name '%s' is already in use." % user_name
                    status = 400
                else:
                    self.set_cookie('signup', user_name, self.application.cookie_secret)
                    status = 200
                    context['redirect'] = provider.auth_url
        except oauth.OAuthError:
            context = "OAuth provider '%s' is not supported." % provider_name
            status = 400

        self.set_body(json.dumps(context))
        return self.render(status_code=status)


class OAuthCallback(Handler):

    def get(self, provider_name):
        """
        The callback landing from OAuth identification.  This is where we
        distribute cookies and post a message.

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
                        context = 'Someone stole your name while you \
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
                        context = 'Bad losername, cleva hacka'
                        status = 400
                else:
                    existing_user = self.application.users.find(user.email)
                    if existing_user:
                        # TODO: update existing_user from user
                        self.set_current_user(existing_user)
                        context['user'] = existing_user.name
                        status = 200
                    else:
                        context = 'You must sign up for an account.'
                        status = 400
            except oauth.OAuthError as e:
                context = "There was an OAuth error: %s" % e
                status = 500
            except database.ValidationError as e:
                context = "Your OAuth provider supplied the value \
                        '%s' for '%s', which is not valid." % (e.field_value,
                                                               e.field_name)
                status = 400
            except database.DuplicateError as e:
                context = "You already have an openscrape account \
                        linked to %s." % provider_name
                status = 400
            except database.DatabaseError as e:
                context = "Database error: %s" % e
                status = 500

        else:
            context = "Login failed: no access code from OAuth provider."
            status = 500

        return self.render_template('post_message', _status_code=status, **{
            'message': json.dumps(context)
        })


class OAuthStatus(Handler):

    @json_only
    def get(self):
        """
        Returns a JSON object with current user status.
        """
        context = {
            'user': self.current_user.name if self.current_user else None
        }
        self.set_body(json.dumps(context))
        return self.render()


class OAuthLogout(Handler):

    def get(self):
        """
        A simple logout then redirect -- just clears their cookie.
        """
        self.logout_user()
        return self.redirect('/')


class UserHandler(Handler):

    @json_only
    def get(self, user_name):
        """
        Get info about this user.
        """
        context = {}
        user = self.application.users.find(user_name)
        if user:
            context = user.to_json(encode=False)
            status = 200
        else:
            context = "No user %s" % user_name
            status = 404

        self.set_body(json.dumps(context))
        return self.render(status_code=status)

    @json_only
    def delete(self, user_name):
        """
        This handler lets a user delete his/her account.  This does not delete
        instructions, but will orphan them.  S/he must match a deletion token.
        """
        context = {}
        if not self.current_user:
            context = 'You are not signed in.'
            status = 401
        elif self.current_user.name == user_name:
            self.application.users.delete(self.current_user)
            context['destroyed'] = self.current_user.name
            status = 200
        else:
            status = 403
            context = "You cannot destroy that user."

        self.set_body(json.dumps(context))
        return self.render(status_code=status)


class InstructionCollectionHandler(Handler):
    """
    This handler provides access to all of a user's instructions.
    """

    @json_only
    def get(self, user_name):
        """
        Provide a listing of all this user's instructions.
        """
        context = { 'user': user_name }
        instructions = self.application.instructions.for_creator(user_name)
        if instructions == None:
            context = "User %s does not exist." % user_name
            status = 404
        else:
            context = self.instruction_paths(user_name, instructions)
            status = 200

        self.set_body(json.dumps(context))
        return self.render(status_code=status)

    @json_only
    def post(self, user_name):
        """
        Allow for cloning and creation.
        """
        context = {}
        user = self.application.users.find(user_name)
        if user != self.current_user:
            context = 'You cannot modify these resources.'
            status = 403
        else:
            action = self.get_argument('action')
            if action == 'create':
                name = self.get_argument('name')
                if self.application.instructions.find(user_name, name):
                    status = 409
                    context = "There is already an instruction with that name"
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
                context = 'Unknown action'
                status = 400

        self.set_body(json.dumps(context))
        return self.render(status_code=status)


class TagCollectionHandler(Handler):
    """
    This handler provides access to all of a user's instructions with a certain
    tag.
    """
    @json_only
    def get(self, user_name, tag):
        context = {'tag': tag, 'user': user_name}
        instructions = self.application.instructions.tagged(user_name, tag)
        if instructions == None:
            status = 404
            context = "No user %s" % user_name
        else:
            status = 200
            context = self.instruction_paths(user_name, instructions)

        self.set_body(json.dumps(context))
        return self.render(status_code=status)


class InstructionModelHandler(Handler):
    """
    This handler provides clients access to a single instruction by name.
    """

    @json_only
    def get(self, user_name, name):
        """
        Display a single instruction.
        """
        context = {}
        doc = self.application.instructions.find(user_name, name)
        if doc:
            context = doc.to_python()
            status = 200
        else:
            context = "Instruction does not exist"
            status = 404

        self.set_body(json.dumps(context))
        return self.render(status_code=status)

    @json_only
    def put(self, owner, name):
        """
        Update a single instruction, creating it if it doesn't exist.
        """
        user = self.current_user
        context = {}
        if not user:
            context = "You are not logged in."
            status = 403
        elif owner != user.name:
            context = 'This is not your template.'
            status = 403
        else:
            try:
                doc = self.application.instructions.save_or_create(
                    user, name,
                    json.loads(self.get_argument('instruction')),
                    json.loads(self.get_argument('tags')))
                status = 201
                context = doc.to_python()
            except ShieldException as error:
                context = "Invalid instruction: %s." % error
                status = 400
            except TypeError as error:
                context = 'Invalid arguments: %s.' % error
                status = 400
            except ValueError as error:
                context = 'Invalid JSON: %s.' % error
                status = 400

        self.set_body(json.dumps(context))
        return self.render(status_code=status)


    @json_only
    def delete(self, owner, name):
        """
        Delete an instruction.
        """
        user = self.current_user
        context = {}
        if not user:
            context = 'You are not logged in'
        elif not owner == user.name:
            context = "You cannot delete someone else's template"
            status = 403
        else:
            instruction = self.application.instructions.find(user, name)
            if instruction:
                self.application.instructions.delete(instruction)
                status = 200
            else:
                status['error'] = "Instruction does not exist"
                status = 404

        self.set_body(json.dumps(context))
        return self.render(status_code=status)


V_C = VALID_URL_CHARS
config = {
    'mongrel2_pair': (RECV_SPEC, SEND_SPEC),
    'handler_tuples': [
        (r'^/oauth/signup$', OAuthSignup),
        (r'^/oauth/login$', OAuthLogin),
        (r'^/oauth/logout$', OAuthLogout),
        (r'^/oauth/status$', OAuthStatus),
        (r'^/oauth/callback/([%s]+)$' % V_C, OAuthCallback),
        (r'^/users/([%s]+)$' % V_C, UserHandler),
        (r'^/instructions/([%s]+)/$' % V_C, InstructionCollectionHandler),
        (r'^/instructions/([%s]+)/([%s]+)$' % (V_C, V_C), InstructionModelHandler),
        (r'^/instructions/([%s]+)/([%s]+)/$' % (V_C, V_C), TagCollectionHandler)],
    'template_loader': load_mustache_env(TEMPLATE_DIR),
    'cookie_secret': COOKIE_SECRET,
}

app = Brubeck(**config)
db = database.get_db(DB_HOST, DB_PORT, DB_NAME)
app.users = database.Users(db)
app.instructions = database.Instructions(app.users, jsongit.init(JSONGIT_DIR), db)
app.run()
