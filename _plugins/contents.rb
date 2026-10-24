require "nokogiri"

module SiteContents
  # Use the rendered heading IDs, so contents links agree with Kramdown and
  # Liquid-generated article sections without parsing Markdown a second time.
  def contents_list(html)
    headings = Nokogiri::HTML5.fragment(html).css(
      "h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]"
    )
    return "" if headings.empty?

    entries = []
    stack = [[0, entries]]
    headings.each do |heading|
      level = heading.name[1].to_i
      stack.pop while stack.last[0] >= level
      entry = { heading: heading, children: [] }
      stack.last[1] << entry
      stack << [level, entry[:children]]
    end

    builder = Nokogiri::XML::Builder.new do |markup|
      markup.ul(class: "toc__menu") { contents_items(markup, entries) }
    end
    builder.doc.root.to_html
  end

  private

  def contents_items(markup, entries)
    entries.each do |entry|
      markup.li do
        heading = entry[:heading]
        markup.a(heading.text, href: "##{heading['id']}")
        unless entry[:children].empty?
          markup.ul { contents_items(markup, entry[:children]) }
        end
      end
    end
  end
end

Liquid::Template.register_filter(SiteContents)
