# Changelog

## [1.2.2] - 2023-09-18
### Fixed
- Improve documentation.

## [1.2.1] - 2023-09-18
### Fixed
- Add the "A TLS Proxy and an HTTP Redirect" example.
- Improve documentation.

## [1.2.0] - 2023-09-18
### Added
- Add support for TLS Proxy Servers.
- Add `ProxySocketAddressInfo` interface.
- Add `requestProxySocketAddressInfo` method to the `ServiceAgent` class.  This method will return a `Promise` that will resolve to a `socketnaut.ProxySocketAddressInfo` object that describes the proxy socket tuple.  Please see the README.md for detail on how to call the method and its return value.
- Add documentation relevant to the additions to the API.

## [1.1.1] - 2023-09-16
### Fixed
- Improve documentation.
- Make linting more specific.

## [1.1.0] - 2023-09-16
### Changed
- Socketnaut depends on Memoir ^2.0.0.  This change can improve Socketnaut's performance, depending on how the log Level is set.  Please see the documentation for how to use Memoir's 2.0.0 LevelLogger.

## [1.0.1] - 2023-09-03
### Fixed
- Add `close` handler before attempting connection.

## [1.0.0] - 2023-09-02
### Added
- CHANGELOG.md
- This project adheres to Semantic Versioning.
### Changed
### Deprecated
### Removed
### Fixed
### Security