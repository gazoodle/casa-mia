# Supervisor scopes the build context to this folder, so the rest of the repo is invisible
# to COPY. The source is cloned from CM_REPO inside the build instead. `main`'s copy of
# these two lines is the real URL; for local testing point the App store at
# tools/fake_git_host.py's printed `#app-dev` URL, which serves a throwaway branch with
# these two lines rewritten. Never hand-edit them for testing.
ARG CM_REPO=https://github.com/gazoodle/casa-mia
ARG CM_REF=main

FROM ghcr.io/home-assistant/base-debian:bookworm AS source
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends \
        git ca-certificates \
    && rm -rf /var/lib/apt/lists/*
ARG CM_REPO
ARG CM_REF
# The Supervisor passes BUILD_VERSION to every build. Referencing it in the RUN makes it part
# of the layer cache key, so each version re-clones; without it Docker reuses the first clone
# forever (the command text never changes) and ships stale source.
ARG BUILD_VERSION
RUN echo "source for ${BUILD_VERSION}" && git clone --depth 1 --branch "${CM_REF}" "${CM_REPO}" /src

FROM ghcr.io/home-assistant/base-debian:bookworm
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends \
        python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*
# PyAV (the camera streams, ~34 MB) in a layer of its own, before the source, so Docker keeps
# it between versions instead of fetching it on every update. ponytail: its version range is
# repeated from pyproject.toml; keep the two alike.
RUN pip install --no-cache-dir --break-system-packages "av>=14"
COPY --from=source /src /src
# Bookworm's system Python is PEP 668 "externally managed"; this container only ever runs
# this one install, so a venv buys nothing.
RUN pip install --no-cache-dir --break-system-packages /src \
    && cp -r /src/integration/custom_components /components \
    && rm -rf /src
# Components land in /components; the app finds them there itself. An ENV would not reach it:
# s6-overlay gives the app a clean environment.
# run.sh starts through with-contenv, which is what hands the app SUPERVISOR_TOKEN.
COPY run.sh /run.sh
RUN chmod +x /run.sh
CMD ["/run.sh"]
