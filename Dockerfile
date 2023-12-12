FROM node:16 AS builder
LABEL stage=build

# Create a folder named function
RUN mkdir -p /home/app

# Wrapper/boot-strapper
WORKDIR /home/app

COPY ./src ./src
COPY ./package.json ./
COPY ./package-lock.json ./
COPY ./tsconfig.json ./
COPY ./.npmrc ./
ENV GH_TOKEN=

# Install dependencies for production
RUN npm ci --omit=dev --ignore-scripts

# Build the project
RUN npm run build

FROM gcr.io/distroless/nodejs16-debian11:nonroot
USER nonroot

COPY --from=builder /home/app /home/app

# Turn down the verbosity to default level.
ENV NPM_CONFIG_LOGLEVEL warn

WORKDIR /home/app

ENV REST_PORT=3000
ENV FUNCTION_NAME="nats-utilities"
ENV NODE_ENV="production"

ENV STARTUP_TYPE=nats
ENV SERVER_URL=0.0.0.0:4222
ENV ACK_POLICY=Explicit
ENV PRODUCER_STORAGE=File
ENV PRODUCER_RETENTION_POLICY=Workqueue

ENV APM_LOGGING=true
ENV APM_URL=http://apm-server.development:8200
ENV APM_SECRET_TOKEN=

ENV prefix_logs="false"

EXPOSE 3000

HEALTHCHECK --interval=60s CMD [ -e /tmp/.lock ] || exit 1

CMD ["build/index.js"]
