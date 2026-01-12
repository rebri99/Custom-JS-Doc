# Custom JS Doc

This is a Customizable-Tag JS Doc that replaces the Complete JS Doc(Default JS Doc).

This JS Doc just hide Default JS Doc's suggest widget instead deactivate Default JS Doc.

This means that you might accidentally use the Default JS Doc instead of the Custom JS Doc.

This is used by typing `/**` and pressing `Enter`.

## Supported Programming Language

* Javascript
* Javascriptreact
* AngularJS

## Requirements

None.

## Features

CustomTags feature description to be added.

## Extension Settings

This extension contributes the following settings:

* `customJsDoc.enable`: Enable/disable this extension.
* `customJsDoc.author`: Set to `@author`. If set, outputs `@author <value>`.
* `customJsDoc.version`: Set to `@version`. If set, outputs `@version <value>`.
* `customJsDoc.sinceFormat`: Set to `@since`. If set, outputs `@since` with this date format. (Example: yyyy. MM. dd.)
  * Only Supported yyyy | MM | dd.
* `customJsDoc.customTags`: Custom tags appended to JS Doc.
  * Example: [{"tag":"see","type":"string","text":"summary"}]
  * Example Result: `@see {string} summary` (with one line break after `@since`)

## Known Issues

None.
