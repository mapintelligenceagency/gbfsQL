## gbfsQL: GraphQL wrapper for [GBFS](https://github.com/NABSA/gbfs) feeds

gbfsQL takes a list of GBFS feeds and exposes a dynamic GraphQL API that you can use. Pull requests are always welcome.

### Currently Supported Features

-   SystemInformation, StationInformation, StationStatus, FreeBike, and SystemAlert endpoints
-   GraphQL Subscriptions
-   Autodiscovory of available feeds

## Quickstart

With the following command you can try out gbfsQL:
```
docker run -it --rm --name gbfsQL -e NODE_ENV=development -p 4000:4000 mapintelligenceagency/gbfsql -v -s <Name of Service>#<URL to */gbfs.json>
```
Now you can visit the GraphiQL Board at http://localhost:4000

## License

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
