# Multimedia 2026 Class Project Template (WIP)

This is a starter template for students to use for their final projects. It's built in Svelte and pulls in the main content from a Google Doc as HTML allowing the use for shortcodes to embed multimedia.

Any images embedded in the Google Doc will automatically be brought in as base64-encoded data URLs. This makes it easy so that no external image hosting or asset management is required, however with lots of images it can slow your webpage and it's recommend to use the image shortcode to host your images externally on CDNs.

This template also uses [CSS Boostrap Framework](https://getbootstrap.com)

This template also allows for additional customization for more advanced students to hard-code right in the template.

# Setup

### Step 1 — Create your repo from the template

Go to [github.com/jrue/multimedia-template-2026](https://github.com/jrue/multimedia-template-2026), click the green **Use this Template** button and choose **Create a new repository**. Give it a name (no spaces) and click **Create repository**. This creates your own copy that can receive updates from the template.

### Step 2 — Clone your repo in VS Code

Open **VS Code**, press <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>, type **Git: Clone** and press enter. Paste in the URL of your new repo (found under the green **Code** button on your repo page) and choose a folder to save it in. When prompted, click **Open** to open the project.

### Step 3 — Install recommended extensions

VS Code will show a prompt asking if you want to install the recommended extensions for this project. Click **Install** to add Svelte, Prettier and ESLint support.

### Step 4 — Run the setup script

Open a Terminal inside VS Code from the top menu: **Terminal** → **New Terminal**. Then run:

```sh
npm run setup
```

The script will walk you through the rest — it checks for Git and nvm (installing them if needed), installs dependencies and guides you through connecting your Google Doc.

> **Note:** If Git isn't installed, the script will launch the Xcode Command Line Tools installer and exit. Once that finishes, re-run `npm run setup`.

### Step 5 — Start the dev server

Once setup completes, start the local dev server:

```sh
npm run dev
```

The site will be available at `http://localhost:5173`. To stop the server, press <kbd>Ctrl</kbd> + <kbd>C</kbd> in Terminal.

# Setting up a Google Doc

Here is [an example Google Doc](https://docs.google.com/document/d/1JaxRkCqZyeWIPwXXocAwUoFaPsqULiQI_Oiby_F0JZ8/edit?usp=sharing) demonstrating shortcodes.

1. Create a Google Doc (or use an existing one) and click the share button to change the General access so that "Anyone with the link" is a **Viewer**.
2. Copy the Link to your clipboard.
3. Back in VS Code, click the file `.env.example`
4. Paste your Google Doc URL _after_ the `DOC_URL=` being careful not to overwrite or change DOC_URL=.
5. You can also set the `BASE_PATH=` to your repository name now, which will be used when you publish this project.
6. Rename the `.env.example` file (right-click --&gt; rename) to just `.env` keeping the period at the beginning of the filename.
7. Back in the Terminal (if you closed it, go to the Terminal menu at the top of the screen and select **New Terminal**) Copy and paste `npm run build:extract-google-doc` and press return.
8. If everything worked, you should see a green "success" message. If not, check the permissions of your Google Doc.

That last step will extract the contents of your Google Doc and store them in this repository to become part of your webpage. You can customize it further from here. Any time you make changes to your Google Doc, you will have to re-run `npm run build:extract-google-doc` to update your site.

The logic for processing the Google Doc is located in `scripts/build-from-google-doc.mjs`.

# Previewing your Project

If you extracted the Google Doc successfully, you can preview your project by running the following command in your Terminal.

```sh
npm run dev
```

You can also add the vite open flag so it will open your browser automatically, saving you a step from copying the localhost:5173 URL.

```sh
npm run dev -- --open
```

To cancel or stop your server, press <kbd>Ctrl</kbd> + <kbd>C</kbd> while the cursor focus is in the Terminal, and this will stop the webserver.

# Using Shortcodes

This template extracts shortcodes in your Google Doc to indicate areas you will embed multimedia content.

Short codes start with two straight brackets, include the name of the component, and any attributes.

```plaintext
[[NameOfComponent src="..." anotherAttr="..."]]
```

Short codes can also have an open-close pairing to surround a block of information.

```plaintext
[[NameOfComponent title="..."]]

Some content here

[[/NameOfComponent]]
```

# Short Codes included in this Template (so far)

To see an example of a Google Doc with shortcodes included, [view this example doc](https://docs.google.com/document/d/1JaxRkCqZyeWIPwXXocAwUoFaPsqULiQI_Oiby_F0JZ8/edit?usp=sharing), which this template uses.

### VideoEmbed

This shortcode accepts YouTube or Vimeo URLs, or an mp4 filename. For mp4 files, create a folder in "static" and put your video file there. Then, for the src attribute in the short code, you should start your filename with a slash like, `/folder_name/my_video.mp4` Don't include "static" even though that's where you'll put your folder_name. You can also include a URL of a video hosted elsewhere like AWS.

The **size attribute** will dictate how the video will appear. "full" means it will go edge-to-edge on the screen. "large" means it will extend out of the text column, but not to the edge of the screen (except on mobile) and "fit" means it will be the same size as the text column of your story.

All of the attributes except src are optional.

```plaintext
[[VideoEmbed
src="name_of_video_file.mp4"
title="Title of your video for SEO, won't be visible"
size="full | large | fit"
caption="Optional Caption to appear below this video"
autoplay="true | false"
controls="true | false"
playsinline="true | false"
mute="true | false"
captions="captions (plural) is a URL to a captions track"
srclang="Two-letter language code of captions track"
label="The language of the captions track, e.g. English"]]
```

### ImageEmbed

You can just put images in your Google Doc and they will automatically show up in your story here. However, if you want more control over the size of the image and its appearance, you can use the ImageEmbed shortcode.

Place your images inside the static folder (it's best to create a folder inside static for organization.) Your `src=` attribute needs to start with a slash `/my_folder_inside_static/my_image.jpg`

You can also embed images directly in Google Docs and use the block version of the shortcode to surround the image and add in some additional data like alt and size to specify how it should appear.

The **size attribute** will dictate how the video will appear. "full" means it will go edge-to-edge on the screen. "large" means it will extend out of the text column, but not to the edge of the screen (except on mobile) and "fit" means it will be the same size as the text column of your story.

```plaintext
[[ImageEmbed
src="name_of_image_file.jpg"
alt="Alt text describing image"
caption="Caption that will appear below the image"
size="full | large | fit"
]]
```

### Scrolly

Scrolly is a special feature where a background image temporarily "sticks" to the top of the viewport as the user continues to scroll. Blocks of text go by and the background image swaps with each piece of text.

Scrolly shortcodes can only be done with block shortcodes and include the image name, alt text, position (start | center | end) and the text block that appears over each corresponding image.

```plaintext
[[Scrolly]]
[
  {
    "img": "scrolly/01.jpg",
    "alt": "Aerial view of the city at dusk",
    "pos": "center",
    "text": "First block of text"
  },
  {
    "img": "scrolly/02.mp4",
    "alt": "Close-up of hands typing",
    "pos": "start",
    "text": "Second block of text"
  },
  {
   "img": "scrolly/03.jpg",
    "alt": "Portrait of the interview subject",
    "pos": "end",
    "text": "Third block of text"
}
]
[[/Scrolly]]
```

All of the images used in a scrolly shortcode should be placed in the `static/scrolly` folder.

# Developing Custom Components and Shortcodes

Components are stored in `src/lib/components/` There is a sample component called `CoolNewFeature.svelte` that one can use as a template and make copies.

The top of your component should have the attributes you support. Include default/fallback values if the author doesn't set them. All shortcode attributes arrive as strings unless you normalize.

```html
<script lang="ts">
	/* 
Example shortcode:

[[CoolNewFeature src="https://example.com/embed" size="large" credit="Name" title="Optional title"]] 

*/
	export let src: string;
	export let size: 'full' | 'large' | 'fit' = 'large';
	export let credit: string | undefined;
	export let title: string = '';
</script>
```

After that, specify how you want your component to appear using Svelte’s template syntax.

In the Google Doc, whenver the author specifies a shortcode with your component name, it will automatically use this template logic to display.

The logic for processing the Google Doc code and making the components work is locaed in `src/lib/components/DocRenderer.svelte`.

# Customizing your Web Project

Going beyond the Google Doc, if you want to custom code your project, the best way to do that is to edit the file `src/routes/+page.svelte`.

You will see where the Google Doc content is injected.

```html
<div class="container">
	<div class="row justify-content-center">
		<div class="col-12 col-sm-10 col-lg-8 col-xxl-6">
			<DocRenderer {blocks} />
		</div>
	</div>
</div>
```

Anything above this will show up before your Google Doc content, and below will show after your Google Doc content. This is a great way to include a topper (hero opener), footer, or other customizations.

For additional JS files or any other components, create a folder inside the "static" folder and put any media/assets in there. Always reference starting with a forward slash and Svelte will take care of the URL references at the time of deployment.

```html
<img src="/my-folder-inside-static/my-custom-image.jpg" alt="example" />
```

# Customizing the CSS Styles

This template uses Bootstrap's CSS Framework. It's imported as SASS and you can edit the `src/app.scss`. You can override any of the Bootstrap variables as long as you set them before the bootstrap import.

[This nifty page](https://rstudio.github.io/bslib/articles/bs5-variables/index.html) has a list of all of the Bootstrap variables you can modify. I've already set the main ones most used. Then, there is of course [the Bootstrap website](https://getbootstrap.com) itself.

Additional custom CSS can be put after the Bootstrap import.

# Adding Fonts

Fonts are included in the `static/fonts/` folder. I recommend downloading Google Fonts [from this website directly](https://gwfh.mranftl.com/fonts), since Google tends to change their fonts over time and hotlinking isn't reliably long term. Any local fonts you download should have include @font-face fules in `static/fonts/fonts.css`

# Script commands

To develop your project run this command in Terminal.

```sh
npm run dev
```

Or, use this extra shortcut to hot load your project.

```sh
npm run dev:open
```

Import content from Google Docs.

```sh
npm run build:extract-google-doc
```

To publish your project, simply commit and sync with Github. A Github Actions script will take care of the rest. To activate the page (only do this once) visit Github.com, go into your Repo's settings, click Pages and make sure to activate the Pages feature by setting the Source to GitHub Actions. Once you do that, your site should be live at:

```plaintext
https://<username>.github.io/<repo-name>/
```

Google take 1-2 minutes to build the site after activating the Pages feature.
