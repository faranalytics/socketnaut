# Changelog

## [1.3.2] - 2023-09-26
### Fixed
- Harmonize handler attachment.
### Changed
- Improve documentation.

## [1.3.1] - 2023-09-24
### Fixed
- Remove default server.
### Changed
- Improve documentation.
- Improve logging.
- Improve example.

## [1.3.0] - 2023-09-23
### Added
- Add `workerCount` parameter to the `ServiceProxy` constructor.  The argument specifies the number of worker threads to be spawned when Socketnaut starts. This setting will override `minWorkers` and `maxWorkers`.
### Changed
- Remove `workersCheckingInterval` default.
- Update documentation in order to reflect additions and changes. 

## [1.2.9 - 1.2.10] - 2023-09-22
### Changed
- Improve the documentation.

## [1.2.8] - 2023-09-22
### Fixed
- Check for nullish Agent. This fixes the case where minWorkers is set to 0.

## [1.2.7] - 2023-09-22
### Added
- Add Koa example.

## [1.2.4 - 1.2.6] - 2023-09-20 - 2023-09-22
### Changed
- Improve the documentation and examples.

## [1.2.3] - 2023-09-20
### Fixed
- Discard closed `Socket`s. If a `Socket` is closed by another `Server` handler, Socketnaut will immediately discard it.
- Improve documentation.

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
- Make linting more specific.
### Changed
- Improve documentation.

## [1.1.0] - 2023-09-16
### Changed
- Depend on Memoir ^2.0.0.  This change can improve Socketnaut's performance, depending on how the log Level is set.  Please see the documentation for how to use Memoir's 2.0.0 LevelLogger.

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