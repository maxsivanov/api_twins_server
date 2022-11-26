# API twins mock server

There are a lot of mock servers/clients out there. Wire-mock, VCR, you name it.

**API TWINS** tries to solve the biggest dilemma of frontend-backend testing:

* Use real backend to feed frontend with real replies
* Use mocked backend

Both approaches have serious downsides:

* Its difficult to get the backend to the state required for a particular test
* Mocks start to drift from the current backend implementation

How does **API TWINS** approach work in general?

1. Backend tests generate files with "canned" HTTP requests
2. `api_twins_server` loads all files generated on step #1
3. Frontend tests make requests to `api_twins_server`

**API TWINS** works best with [Use cases](https://en.wikipedia.org/wiki/Use_case).
Look how "canned" request are stored.

```
../twins
├── _default
│   └── GET_api_embed_v1_loader.v001.js.json
├── _manual
│   ├── GET_api_insecure_v1_options.json
│   ├── OPTIONS_api_embed_v1_check.json
│   └── OPTIONS_api_embed_v1_send.json
└── embed_mode_2
    ├── [user_exists]_GET_api_forms_v1_form.json
    ├── [user_exists]_POST_api_embed_v1_check.json
    ├── [user_exists]_POST_api_embed_v1_send.json
    ├── [user_exists]_POST_api_embed_v1_token.json
    ├── [user_exists]_POST_api_forms_v1_form.json
    ├── [user_absent]_POST_api_embed_v1_send.json
    └── [user_absent]_POST_api_forms_v1_form.json
```

* `embed_mode_2` -- use case name
* `user_exists`, `user_absent` -- use case path
(*extension* in terms of use case theory)
* `_default` -- "cans" for all use cases
* `_manual` -- the only place where you can put your manual written "cans".
Files in other directories are created by backend tests

## "Can" file format

JSON file:

```
{
    "method": "POST",                        # Method
    "url": "/api/embed/v1/send",             # Endpoint pathname
    "query": {                               # Query string parameters
        "seriesId": "8",
        "mode": "2"
    },
    "body": {                                # Request body parameters
        "phone": "9000000",
        "code": "0000"
    },
    "reply": {                               # Server reply
        "key1": "value1",
        "key2": "value2"
    },
    "replyHeaders": {                        # Headers to be set by server
        "Content-Type": "application/json"
    }
}
```

## How api_twins_server matches requests with responses

* **use case name** and **use case path** match
    * if not found search repeats with `_default` and `_manual`
    **use case name** and empty **use case path**
* url (enpoint pathname) matches
* method matches
* all **body** entries listed in "can" file are equal
* all **query** entries listed in "can" file are equal


In order to match the request sent to `api_twins_server` **must** have all
input parameters present in the "can" file and **may** have any additional
parameters.

## How api_twins_server knows which of the use cases/path to use?

There is no magic here. Frontend tests have to set the use case/path name during
test setup. There are options:

* **Cookie**. The simpliest one as cookie is glued into all requests
automatically and no code change is required

```
<script>
document.cookie = 'api_twin=embed_mode_2:user_exists; path=/'
<script>
```

* **Get parameter**. Add `?api_twin=embed_mode_2:user_exists` to all requests
you want to mock

* **Header**. Add `X-Api-Twin: embed_mode_2:user_exists` header to all
requests you want to mock

## How to change some parameters?

All parameters are passed with environment:

* `PUBLIC` -- `api_twins_server` can work as server for static assets (images,
  JS bundls, etc.). `PUBLIC` environment variable has to be set to some
  filesystem path in order to server enable this feature
* `PUBLIC_PATH` -- webserver path to the static assets (`/` by the default).
* `PORT` -- server port (3000 by the default)
* `TWINS_PATH` -- directory where **API TWINS** files are located
  (`./api_twins` by the default).
