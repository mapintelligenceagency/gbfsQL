## gbfsQL: GraphQL wrapper for [GBFS](https://github.com/NABSA/gbfs) feeds

gbfsQL takes a list of GBFS feeds and exposes a dynamic GraphQL API that you can use. Pull requests are always welcome.

### Currently Supported Features

We support [GBFS Version v1.1](https://github.com/NABSA/gbfs/releases/tag/v1.1-RC) and aim to update this project to newer releases as soon as they become available.

-   SystemInformation, StationInformation, StationStatus, FreeBike, and SystemAlert endpoints
-   Real-time updates via GraphQL Subscriptions
-   Autodiscovory of available feeds

## Notes

gbfsQL will query the GBFS-Feed every time the TTL expires and cache results. That means requesting data from gbfsQL is very fast and will not incur an additonal request to the GBFS-Feed.

## Quickstart

Try the [Example](#example) below or use the follwing command to start a gbfsQL Docker container:

```
docker run -it --rm --name gbfsQL -e NODE_ENV=development -p 4000:4000 mapintelligenceagency/gbfsql -service <Name of Service>#<URL to */gbfs.json>
```

## Example

Create a docker-compose.yml file like this:

```
version: '3.3'
services:
    gbfsql:
        container_name: gbfsQL
        command: ["-service", "JUMP_LA#https://gbfs.uber.com/v1/laxs/gbfs.json", "-service", "UBIKE_UV#http://ubike.virginia.edu/opendata/gbfs.json", "-verbose"]
        environment:
            - NODE_ENV=development
        ports:
            - '4000:4000'
        image: mapintelligenceagency/gbfsql
```

Start gbfsQL with `docker-compose up`

Now you can visit the GraphiQL Board at http://localhost:4000 and query data using this sample query:

```
query {
  JUMP_LA {
    bikes {
      lat
      lon
    }
  }
  UBIKE_UV {
    stations {
      name
      currentStatus {
        is_renting
      }
    }
  }
}
```

## License

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
