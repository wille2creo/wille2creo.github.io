export PATH := /opt/homebrew/opt/ruby/bin:$(PATH)
export BUNDLE_PATH := vendor/bundle
export BUNDLE_USER_HOME := .bundle
export BUNDLE_FORCE_RUBY_PLATFORM := true

.PHONY: install build serve
install:
	bundle install

build:
	JEKYLL_ENV=production bundle exec jekyll build

serve:
	bundle exec jekyll serve -H 0.0.0.0
