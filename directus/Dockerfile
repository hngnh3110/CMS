FROM node:22-alpine AS extensions
WORKDIR /build
RUN corepack enable && corepack prepare pnpm@11.19.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build:directus
FROM directus/directus:11.17.4
COPY --from=extensions --chown=node:node /build/directus/extensions/vtv-module/package.json /directus/extensions/vtv-module/package.json
COPY --from=extensions --chown=node:node /build/directus/extensions/vtv-module/dist /directus/extensions/vtv-module/dist
COPY --from=extensions --chown=node:node /build/directus/extensions/vtv-api/package.json /directus/extensions/vtv-api/package.json
COPY --from=extensions --chown=node:node /build/directus/extensions/vtv-api/dist /directus/extensions/vtv-api/dist
