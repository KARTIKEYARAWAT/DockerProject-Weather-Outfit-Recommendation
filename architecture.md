# Architecture

                           USER
                             │
                             ▼
                    NGINX CONTAINER
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
     REACT FRONTEND                    SPRING BOOT BACKEND
                                               │
                                               ▼
                                       WEATHER API SERVICE
                                               │
                      ┌────────────────────────┴──────────────────────┐
                      ▼                                               ▼
                MYSQL CONTAINER                               REDIS CONTAINER

## CI/CD FLOW
Developer Pushes Code -> GitHub Actions Triggered -> Maven Build Starts -> Tests Execute -> Docker Image Builds -> Docker Compose Deploys Containers
