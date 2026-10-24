# Fail before installing or building with a different interpreter than CI.
expected = File.read(File.expand_path("../.ruby-version", __dir__)).strip
unless RUBY_VERSION == expected
  abort "Ruby #{expected} is required; running #{RUBY_VERSION}. " \
    "Select the version in .ruby-version before running make."
end
