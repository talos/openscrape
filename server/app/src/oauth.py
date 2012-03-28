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
import urlparse
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
                'scope' : 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
                'response_type': 'code'
            }
        },
        'token': {
            'url': 'https://accounts.google.com/o/oauth2/token',
            'data': {
                'grant_type': 'authorization_code'
            },
            'format': 'json'
        },
        'api': {
            'url': 'https://www.googleapis.com/oauth2/v1/userinfo'
        },
        'parse_user': {
            'format': 'json',
            'email': 'email',
            'id': 'id',
            'url': 'link',
            'img': 'picture',
            'name': 'name'
        }
    },

    'github': {
        'auth': {
            'url': 'https://github.com/login/oauth/authorize'
        },
        'token': {
            'url': 'https://github.com/login/oauth/access_token',
            'format': 'url'
        },
        'api': {
            'url': 'https://api.github.com/user'
        },
        'parse_user': { # http://developer.github.com/v3/users/
                       'format': 'json',
                       'email' : 'email',
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
        return "%s:%s/oauth/callback/%s" % (self.host, self.port, self.provider)

    @property
    def auth_url(self):
        """
        The URL to which users should be redirected for auth.
        """
        url = self.config['auth']['url']
        params = self.config['auth'].get('params', {})
        params.update({
            'redirect_uri': self._callback_uri,
            'client_id': self.client_id
        })
        return "%s?%s" % (url, urllib.urlencode(params))

    def new_user(self, code):
        """
        Create a User model from the provided access code.

        Raises an OAuthError if something goes wrong.
        """
        data = self.config['token'].get('data', {})
        data.update({
            'code': code,
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'redirect_uri': self._callback_uri
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
            warnings.warn(str(data))
            raise OAuthError("OAuth token request failed, status %s, message %s" %
                             (token_response.status_code, token_response.content))

        try:
            token_format = self.config['token']['format']
            if token_format == 'json':
                access_token = json.loads(token_response.content)['access_token']
            elif token_format == 'url':
                access_token = dict(urlparse.parse_qsl(token_response.content))['access_token']
            else:
                raise RuntimeError("Unknown response format %s" % token_format)

        except KeyError:
            raise OAuthError("Missing access_token: %s" % token_response.content)
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

        parse_user = self.config['parse_user']
        if parse_user['format'] == 'json':
            try:
                raw_dict = json.loads(api_response.content)

                return User(email=raw_dict[parse_user['email']],
                            provider=self.provider,
                            provider_id=str(raw_dict[parse_user['id']]),
                            provider_url=raw_dict[parse_user['url']],
                            provider_img=raw_dict[parse_user['img']],
                            provider_name=raw_dict[parse_user['name']],
                            provider_dict=raw_dict)
            except ValueError:
                raise OAuthError("Bad API JSON: %s" % api_response.content)
            except KeyError as e:
                raise OAuthError("API missing key: %s" % e)
        else:
            raise RuntimeError("Unknown user format: %s" % self.config['parse_user']['format'])


