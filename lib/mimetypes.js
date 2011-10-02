function Mimetypes() {
    this.extToType = {
	html : "text/html",
	css : "text/css",
	js : "text/javascript",
	png : "image/png",
	m4v : "video/mp4",
    }
}
exports.Mimetypes = Mimetypes

Mimetypes.prototype.guessType = function guessType(fileName) {
    /* get the extension */
    parts = fileName.split(".")
    if (parts.length == 1) {
	return undefined
    } else {
	return this.extToType[parts[parts.length - 1]]
    }
}
