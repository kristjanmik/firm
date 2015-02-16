var request = require('request');
var cheerio = require('cheerio');
var err = require('error-helper');


exports.is = function (options, callback) {

  var queryString = {
    nafn: options.name || '',
    heimili: options.address || '',
    kt: options.ssn || '',
    vsknr: options.vsknr || ''
  };

  request.get({
    url: 'http://www.rsk.is/fyrirtaekjaskra/leit',
    qs: queryString
  }, function (error, response, body) {
    if (error || response.statusCode !== 200) {
      return callback(err(502,'www.rsk.is refuses to respond or give back data'));
    }

    var obj = {
      results: []
    },
      $ = cheerio.load(body);

    function cleanHtml(input) {
      var html = input.html();
      if (!html) {
        return '';
      }
      return html.replace(/<(?:.|\n)*?>/gm, '');
    };

    if ($('.resultnote').length == 0) {
      var tr = $('.boxbody > .nozebra tbody tr');
      if (tr.length > 0) {
        var name = $('.boxbody > h1').html(),
          ssn = $('.boxbody > h1').html();

        obj.results.push({
          name: name.substring(0, name.indexOf('(') - 1),
          ssn: ssn.substring(ssn.length - 11, ssn.length - 1),
          active: $('p.highlight').text().length === 0 ? 1 : 0,
          address: cleanHtml(tr.find('td').eq(0))
        });
      }
    } else {
      var table = $('table tr');
      table = table.slice(1, table.length);

      table.each(function () {

        var td = $(this).find('td');
        var nameRoot = cleanHtml(td.eq(1));
        var purged = "(Félag afskráð)";

        obj.results.push({
          name: nameRoot.replace("\n", "").replace(purged, "").replace(/^\s\s*/, '').replace(/\s\s*$/, ''),
          ssn: cleanHtml(td.eq(0)),
          active: nameRoot.indexOf(purged) > -1 ? 0 : 1,
          address: cleanHtml(td.eq(2))
        });

      });
    }

    obj.results = obj.results.filter(function (result) {
      return result.active
    })

    return callback(null, obj)
  });
};
