# *Redirect HTTP connections to an HTTPS Service.* <sup><sup>(example)</sup></sup>

In this example you will create an HTTP Service and a HTTPS Service.  The HTTP Service will redirect all requests to the HTTPS Service.

The endpoint i.e., `/`, runs a for loop that blocks for 100ms on each request and returns the string "Hello World!".

```js
for (let now = Date.now(), then = now + 100; now < then; now = Date.now()); // Block for 100 milliseconds.
```
## Requirements
Please make sure your firewall is configured to allow connections on `0.0.0.0:3000` and `0.0.0.0:3443` for this example to work.

## Instructions

### Clone the Socketnaut repo.
```bash
git clone https://github.com/faranalytics/socketnaut.git
```
### Change directory into the relevant example directory.
```bash
cd socketnaut/examples/redirect_http_to_https
```
### Install the example dependencies.
```bash
npm install
```
### Build the TypeScript application.
```bash
npm run build
```
### Edit https_server.ts in order to read your `key` and `cert` files.
```js
const service = createServiceAgent({
    server: https.createServer(
        {
            key: fs.readFileSync('../../../secrets/key.pem'),
            cert: fs.readFileSync('../../../secrets/crt.pem')
        }) // Configure this HTTPS server however you choose.
});
```
### Run the application.
```bash
npm start
```
### Test the HTTP redirect using your browser.
```bash
http://example.com:3000
```