export BUNDLE_PATH := vendor/bundle
export BUNDLE_USER_HOME := .bundle
.DEFAULT_GOAL := install

.PHONY: install build serve check

install:
	bundle install

build:
	JEKYLL_ENV=production bundle exec jekyll build

serve:
	bundle exec jekyll serve -H 0.0.0.0

check: build
	npm run check
