# -*- coding: utf-8 -*-

"""
server.app.oauth
"""

try:
    import simplejson as json
    json
except ImportError:
    import json
import urllib
import requests
import warnings
import ConfigParser

from models import User

config = ConfigParser.SafeConfigParser()
if not len(config.read('config/oauth.ini')):
    warnings.warn("No oauth config at conf/oauth.ini, no providers will be available.")

providers = {
    'google':  {
        'auth': {
            'url':  'https://accounts.google.com/o/oauth2/auth',
            'params': {
                'scope' : 'https://www.googleapis.com/auth/userinfo.profile',
                'response_type': 'code'
            }
        },
        'token': {
            'url': 'https://accounts.google.com/o/oauth2/token',
            'data': {
                'grant_type': 'authorization_code'
            }
        },
        'api': {
            'url': 'https://www.googleapis.com/oauth2/v1/userinfo'
        },
        'parse_user': {
            'format': 'json',
            'id': 'id',
            'url': 'link',
            'img': 'img',
            'name': 'name'
        }
    },

    'github': {
        'auth': {
            'url': 'https://github.com/login/oauth/authorize'
        },
        'token': {
            'url': 'https://github.com/login/oauth/access_token'
        },
        'api': {
            'url': 'https://api.github.com/user'
        },
        'parse_user': { # http://developer.github.com/v3/users/
                       'format': 'json',
                       'id': 'id',
                       'url' : 'html_url',
                       'img' : 'avatar_url',
                       'name': 'name'
                      }
    },

    'facebook' : {
        'auth': {
            'url': 'https://www.facebook.com/dialog/oauth'
        },
        'token': {
            'url':'https://graph.facebook.com/oauth/access_token',
            'method': 'get'
        },
        'api': {
            'url':'https://graph.facebook.com/me'
        }
    }
}


class OAuthError(RuntimeError):
    pass


class OAuthProvider(object):
    def __init__(self, host, port, provider):
        self.host = host
        self.port = port
        self.provider = provider
        if provider in providers:
            self.config = providers[provider]
        else:
            raise OAuthError("No provider definition for %s" % provider)

        try:
            self.client_id = config.get(provider, 'id')
            self.client_secret = config.get(provider, 'secret')
        except ConfigParser.NoOptionError:
            raise OAuthError("Missing secret or id for %s" % provider)
        except ConfigParser.NoSectionError:
            raise OAuthError("No OAuth config for %s" % provider)

    @property
    def _callback_uri(self):
        """
        The full URI that should be used for callback.
        """
        return "%s:%s/oauth/callback/%s" % (self.host, self.port, self.name)

    def auth_url(self, state):
        """
        The URL to which users should be redirected for auth.
        """
        url = self.config['auth']['url']
        params = self.config['auth'].get('params', {})
        params.update({
            'state': state,
            'redirect_uri': self._callback_uri
        })
        return "%s?%s" % (url, urllib.urlencode(params))

    def get_user(self, code):
        """
        Get a User model from the provided access code.

        Raises an OAuthError if something goes wrong.
        """
        data = self.config['token'].get('data', {})
        data.extend({
            'code': code,
            'client_id': self.client_id,
            'client_secret': self.client_secret,
        })
        token_url = self.config['token']['url']
        method = self.config['token'].get('method', 'post') # default to 'post'

        try:
            if method == 'post':
                token_response = requests.post(token_url, allow_redirects=False, data=data)
            elif method == 'get':
                token_response = requests.get(token_url, allow_redirects=False, params=data)
            else:
                raise RuntimeError("Bad OAuth config token method: %s" % method)
        except requests.exceptions.RequestException as e:
            raise OAuthError(e)

        if token_response.status_code != 200:
            raise OAuthError("OAuth token request failed, status %s, message %s" %
                             (token_response.status_code, token_response.content))

        try:
            access_token = json.loads(token_response.content)['access_token']
        except KeyError:
            raise OAuthError("Missing access_code: %s" % token_response.content)
        except ValueError:
            raise OAuthError("Bad token JSON: %s" % token_response.content)

        try:
            api_response = requests.get(self.config['api']['url'], params={
                'access_token': access_token
            })
        except requests.exceptions.RequestException as e:
            raise OAuthError(e)

        if api_response.status_code != 200:
            raise OAuthError("OAuth API request failed, status %s, message %s" %
                             (api_response.status_code, api_response.content))

        if self.config['parse_user']['format'] == 'json':
            try:
                raw_dict = json.loads(api_response.content)

                return User(provider=self.provider,
                            provider_id=raw_dict['id'],
                            provider_url=raw_dict['html_url'],
                            provider_pic=raw_dict['avatar_url'],
                            provider_name=raw_dict['name'],
                            provider_dict=raw_dict)
            except ValueError:
                raise OAuthError("Bad API JSON: %s" % api_response.content)
            except KeyError as e:
                raise OAuthError("API missing key: %s" % e)
        else:
            raise RuntimeError("Unknown user format: %s" % self.config['parse_user']['format'])


