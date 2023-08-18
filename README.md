## Feed The Dog

Feed The Dog is a simple tracker for whether the dog has been fed the right number of times today.

Tiberius is a very smart dog. He knows when he is supposed to be fed, but he also knows that he can sometimes trick one or more of his humans into feeding him an extra meal. Or give him an extra snack. So we needed a way to track the dogfood.

We all have iPhones. The iPhone `Shortcuts` app allows you to link a shortcut to an NFC token. So I went on Amazon and bought a bunch of NFC stickers, and I stuck one to the top of the dog food bin.

The goal was to build the following workflow:

1. To feed the dog, first scan the NFC
2. SHORTCUT: The NFC will link to an app that tracks how much the dog has eaten
    * It will send an HTTP POST request to the app
3. SPIN: The app will fetch a record from K/V storage that contains the following information:
    * The date
    * The number of times the dog has eaten
    * Whether the dog has also had a treat or snack
4. SPIN: If the dog has not been fed yet, this will create a new day record
5. SPIN: The JSON API will allow provide information about how many times the dog has eaten
    * If the dog has eaten too many times, the app will send a warning
    * Otherwise the app will increment the number of times eaten and return a success message
6. SHORTCUT: If the dog has eaten 3 times (the number of times he's supposed to eat), the app may suggest a treat if the dog hasn't already had one
7. SPIN: There is also a WebUI that shows the dog's current feeding state. The action will open the app
8. SHORTCUT: The shortcut will open the WebUI at the end


## How I Build "Feed The Dog"

This is built in two parts: A Spin app and a Shortcut coded through the iPhone nocode Shortcut app

### The Spin App

```
$ spin new http-ts feed-the-dog 
Description: Track the number of times the dog has been fed
HTTP base: /
HTTP path: /...
$ cd feed-the-dog 
$ npm install && spin build
```

I know that I will have some static files, so I installed the fileserver:

```console
$ spin add static-fileserver
Enter a name for your new component: files
HTTP path: /static/...
Directory containing the files to serve: assets
$ mkdir assets
```

I also know that I will need key/value storage, so I enabled that in `spin.toml`:

```toml
[[component]]
id = "feed-the-dog"
source = "target/feed-the-dog.wasm"
exclude_files = ["**/node_modules"]
key_value_stores = ["default"]  # <--- ADDED THIS
[component.trigger]
route = "/..."
[component.build]
command = "npm run build"
```

From there, I edited the `src/index.js`. You can see the result in the code.

There are three endpoints:

- `GET /` is a simple web page showing how many times the dog has eaten today
- `GET /v1/dog` provides read-only JSON data for how much the dog has eaten
- `POST /v1/dog/feed` updates the number of times the dog has eaten. An empty JSON body will suffice.

The format of the Dog Food record is as follows:

```json
{"date":"08-16-2023","fed":2,"treats":0}
```

The `fed` attribute is how many times the dog has been fed.

Once all of this is done, I do a `spin build && spin deploy` to deploy to Fermyon Cloud, then I use the returned domain in my iPhone action.

## The iPhone Shortcut and Automation

I created the Shortcut in two phases:
* First, I created a regular shortcut
* Then I linked the NFC token to the shortcut

The Feed The Dog shortcut has the following sequence of actions:

1. `URL` action set to the Fermyon.app version of the `GET /v1/dog` URL: `https://feed-the-dog-AAAAA.fermyon.app/v1/dog`
2. `Get Contents Of` web action, using `URL` as the input
3. `Get Value for fed in Contents of the URL` using the Dictionary Get action returns the value of `{"fed": 2}` in the JSON above
4. `Get numbers from Dictionary value` parses the value of `fed` into a numeric value
5. `If Numbers is greater than or equal to 3` uses the output of the `Get numbers` call, sees if it's greater than 3 (the dog's max meals)
    1. Show alert The dog has been fed
6. Otherwise
    1. URL set to `POST /v1/dog/feed`
    2. `Get Contents of URL`
7. End if
8. `Open` (Safari Open URLs action) the `https://feed-the-dog-AAAA.fermyon.app/` to show the result in a browser.

Then, in an `Automation`, I link the NFC tag to run `Shortcut Feed the Dog`.

By breaking it into two (the shortcut and the automation), I can tinker with, manually run, and share the action with others.

## Dog Graphics

I used the favicon.io generator to generate some dog favicons: https://favicon.io/emoji-favicons/dog-face

Then I put the resulting images in `assets/`. From there, I could use the following HTML to add favicon support:

```html
<link rel="apple-touch-icon" sizes="180x180" href="/static/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="/static/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/static/favicon-16x16.png">
<link rel="manifest" href="/static/site.webmanifest">
```

Then to remap the `/favicon.ico` (the default place the browser looks) to `/static/favicon.ico`, I added the redirect module:

```console
$ spin add redirect             
Enter a name for your new component: redirect-favicon
Redirect from: favicon.ico
Invalid value: Input 'favicon.ico' does not match pattern '^/\S*$'
Redirect from: /favicon.ico
Redirect to: /static/favicon.ico
```
