<img src="assets/svgs/contributing.svg"> <!-- i spent 30 minutes on this bart simpson, no views i bet! so see ya -->

Members from the [Cut the Rope Home Organization](https://github.com/ctrh-org) are free to directly commit to the repository, meanwhile others are free to send pull requests for review. When editing various files as a non-collaborator GitHub automatically suggests creating a fork so this should hopefully be easy to do.

----

## Writing articles

- Set a proper name for your article — it will be the same as the filename, except with all underscores (`_`) swapped for spaces (` `).
  - You can also add the file to a subfolder by starting with a tilde.
- Use short sections and proper headings. It's best if you don't make them *too* short, however...
- Upload article files to `articles/Media/` (you can create subfolders there, like `/objects/`, for organizing!) 
  - OR upload them to a [whitelisted](https://github.com/CtRHome/wiki/blob/main/markdown.js#L8) external source. 
  - The variable right below ⬑ `hostwhitelist` also indicates which filetypes will outright refuse to be shown on the wiki. It might change over time due to demand.
- Use `\` to escape markdown conversions if you need literal characters.
- Use wiki links with `[[Article Name]]` or `[[Article Name|Custom text]]`.
- Use citations for stuff that can be backed up — put a reference anywhere as `[^something]` and define it at the bottom of the markdown file as `[^something]: info | https://example.com`
    - having those separately is also allowed: `[^something]: https://example.com` or `[^something2]: info`
  - citation needed marker: `[^?]` (more might be added later)
- Commit with the finished article markdown file.

See the [Markdown Example](https://ctrhome.github.io/wiki#Special:Preview) page for more!

----

Characters like `?` and `:` can’t exist in filenames on Windows, so you should use fullwidth versions (`？` `：`) if needed. The wiki will still attempt to show the normal characters where possible...

You can also use the [Visual Editor](https://ctrhome.github.io/wiki#Special:Preview) tab to see how the markdown will look on the wiki. Better yet, go [download this repository](https://github.com/CtRHome/wiki/archive/refs/heads/main.zip) and use the Live Preview extension in VSCode to see it in action more efficiently!
<sup><sup>Unless you're on a phone, then the Visual Editor is your only option...</sup></sup> 

----

## Editing wiki code

This might be a doozy, however, here are some clarifications on the layout of the project to help you get started:

<table>
  <tr>
    <td>
      <code>index.html</code> <code>index.css</code> <code>index.js</code>
    </td>
    <td>Smaller features and the entire page theme</td>
  </tr>
  <tr>
    <td>
      <code>markdown.css</code> <code>markdown.js</code>
    </td>
    <td>Exclusively for markdown parsing/rendering</td>
  </tr>
  <tr>
    <td>
      <code>preview.js</code>
    </td>
    <td>Exclusively for the <a href="https://ctrhome.github.io/wiki#Special:Preview">Visual Editor</a> page</td>
  </tr>
  <tr>
    <td>
      <code>/assets/images/</code>
    </td>
    <td>Images for the UI. Preferably don't use anything from here in real articles.</td>
  </tr>
  <tr>
    <td>
      <code>/assets/svgs/</code>
    </td>
    <td>Specifically a clarification for this — GIFs and icons go in images, but vectors go here.</td>
  </tr>
  <tr>
    <td>
      <code>/articles/</code>
    </td>
    <td>Well, the articles, of course!</td>
  </tr>
</table>

The rest should be trivial to understand.

Any code additions or changes that do not have
- Very careless vibecoding,
- A minified-esque format,
- Or the opposite — [convoluted functions](articles/Media/goodpractice.jpg) that can be easily done in a much simpler way

should be fine to do!

----

**Slight roadblocks**
<sup>· All of the CSS usually has multiple properties stacked per line to reduce the space taken up;</sup>
<sup>· Similarly with JS — simple variable definitions and/or function calls are usually stacked two per line.</sup>
<sup>If you don't have an issue with this, then you can go ahead and apply changes to the code.</sup>