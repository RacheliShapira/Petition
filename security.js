module.exports.checkUrl = function(url) {
    return new Promise(function(resolve, reject) {
        if (
            url.startsWith("http://") ||
            url.startsWith("https://") ||
            url.startsWith("//")
        ) {
            resolve(url);
        } else if (url.startsWith("www.")) {
            resolve("http://" + url);
        } else if (url == "") {
            resolve(null);
        } else {
            reject(new Error());
        }
    });
};
