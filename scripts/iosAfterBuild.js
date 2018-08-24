module.exports = function(ctx) {
    // make sure ios platform is part of build
    if (ctx.opts.platforms.indexOf('ios') < 0) {
        return;
    }
    var fs = ctx.requireCordovaModule('fs'),
        path = ctx.requireCordovaModule('path'),
        deferral = ctx.requireCordovaModule('q').defer();

    var AppDelegateh = path.join(ctx.opts.projectRoot, 'platforms/ios/SitaULD/Classes/AppDelegate.h');
    var AppDelegatehReplacement = path.join(ctx.opts.projectRoot, 'scripts/AppDelegate.h');
    var AppDelegatem = path.join(ctx.opts.projectRoot, 'platforms/ios/SitaULD/Classes/AppDelegate.m');
    var AppDelegatemReplacement = path.join(ctx.opts.projectRoot, 'scripts/AppDelegate.m');

    function replaceContents(file, replacement, cb) {
      fs.readFile(replacement, (err, contents) => {
        if (err) return cb(err);
        fs.writeFile(file, contents, cb);
      });
    }

    replaceContents(AppDelegateh, AppDelegatehReplacement, err => {
      if (err) {
        throw err;
      }
      console.log('Done replace AppDelegateh');
    });
    replaceContents(AppDelegatem, AppDelegatemReplacement, err => {
      if (err) {
        throw err;
      }
      console.log('Done replace AppDelegatem');
    });

return deferral.promise;

};
