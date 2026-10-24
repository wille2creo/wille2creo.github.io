export BUNDLE_PATH := vendor/bundle
export BUNDLE_USER_HOME := .bundle
.DEFAULT_GOAL := install

.PHONY: check-runtime install build serve check
check-runtime:
	ruby script/check-runtime.rb

install: check-runtime
	bundle install

build: check-runtime
	JEKYLL_ENV=production bundle exec jekyll build

serve: check-runtime
	bundle exec jekyll serve -H 0.0.0.0

check: build
	npm run check
