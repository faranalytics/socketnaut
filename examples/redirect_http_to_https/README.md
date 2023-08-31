# *Redirect connections to an HTTP Service to an HTTPS Service.* <sup><sup>(example)</sup></sup>

In this example you will create an HTTP Service and a HTTPS Service.

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
### Run the application.
```bash
npm start
```
### Test the HTTP Service redirect using your browser.
```bash
http://example.com:3000
```