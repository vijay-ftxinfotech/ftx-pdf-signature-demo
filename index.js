var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var port = process.env.PORT || 8484;
let pdfFile = "example1.pdf";

const bodyParser = require('body-parser')

app.use(bodyParser.urlencoded({
    extended: false
}))
app.use(bodyParser.json())

// PDFParser = require("pdf2json");
// let pdfParser = new PDFParser();     
//     pdfParser.on("pdfParser_dataReady", pdfData => {        
//         console.log(JSON.stringify(pdfParser.getAllFieldsTypes()));
//     });
//     pdfParser.loadPDF('./shared/example.pdf');

var hummus = require('hummus'),
    PDFDigitalForm = require('./pdf-digital-form')

var mime = require('mime');
const express = require('express');
var db = require('./annonate-db');

const path = require('path');
app.use("/shared", express.static(path.join(__dirname, 'shared')));

app.set('view engine', 'pug')
app.set('views', __dirname + '/views');

app.set('shared', __dirname + '/shared');


app.post('/download', function(req, res) {

    var resultPath = './shared/example14.pdf';
    var sourcePath = './shared/example1.pdf';

    if (pdfFile) {
        sourcePath = `./shared/${pdfFile}`;
    }
    var hummus = require('hummus');

    var pdfReader = hummus.createReader(sourcePath);
    pageNumber = pdfReader.getPagesCount()

    let pdf_height = (req.body.pdfheight) ? req.body.pdfheight : 0;
    if (req.body.annotations) {
        annotations = JSON.parse(req.body.annotations);
    } else {
        annotations = [];
    }
    var pdfWriter = hummus.createWriterToModify(sourcePath, {
        modifiedFilePath: resultPath
    });


    for (var p = 0; p < pageNumber; p++) {

        var pageModifier = new hummus.PDFPageModifier(pdfWriter, p, true);


        annotations.forEach(function(element) {
            console.log(element.page_height);

            var cxt = pageModifier.startContext().getContext();
            if (element.page == p + 1) {
                if (element.type == 'fillcircle' || element.type == 'emptycircle' || element.type == 'circle') {
                    // 610,790
                    cxt.drawCircle(element.cx, (pdf_height - element.cy), element.r, {
                        type: (element.type == 'fillcircle') ? 'fill' : 'stroke',
                        color: element.color,
                        width: (element.type == 'circle') ? 5 : 2,
                    });
                } else if (element.type == 'area') {
                    cxt.drawImage(element.x, (pdf_height - element.y) - element.height, './shared/signature.png', {
                        transformation: {
                            width: element.width,
                            height: element.height
                        }
                    });
                    // cxt.drawRectangle(element.x, (pdf_height - element.y) - element.height, element.width, element.height, {
                    //     type: 'stroke',
                    //     color: 'red',
                    //     width: 1,
                    // });
                } else if (element.type == 'drawing') {
                    var singleLines = Array.prototype.concat.apply([], element.lines);
                    for (var i = 0; i <= singleLines.length; i = i + 1) {
                        if (i % 2 != 0) {
                            singleLines[i] = pdf_height - singleLines[i]
                        }
                    }
                    for (var i = 4; i <= singleLines.length; i = i + 4) {
                        cxt.drawPath(singleLines[i - 4], singleLines[i - 3], singleLines[i - 2], singleLines[i - 1], singleLines[i], singleLines[i + 1], singleLines[i + 2], singleLines[i + 3], {
                            width: element.width,
                            color: element.color,
                        });
                    }
                } else if (element.type == 'textbox') {
                    var arialFont = pdfWriter.getFontForFile(__dirname + '/fonts/arial.ttf');
                    cxt.writeText(element.content, element.x, pdf_height - element.y, {
                        font: arialFont,
                        size: element.size,
                        // colorspace:'rgb',
                        color: element.color,
                    });
                }

            }

            pageModifier.endContext().writePage();
        });
    }

    pdfWriter.end();

    var file = resultPath;
    var filename = path.basename("Download-annonate.pdf");
    var mimetype = mime.lookup(file);
    res.setHeader('Content-disposition', 'attachment; filename=' + filename);
    res.setHeader('Content-type', mimetype);
    var filestream = fs.createReadStream(file);
    filestream.pipe(res);


});

app.get('/', function(req, res) {
    filePath = './shared/' + req.query.pdf;
    try {
        stats = fs.statSync(filePath);
        pdfFile = req.query.pdf;
    } catch (e) {
        console.log("File does not exist.");
    }
    // res.sendfile('./index.html', { pdf: pdfFile, message: 'Hello there!'});            

    res.render('index', {
        pdf: pdfFile,
        message: 'Hello there!'
    });
});

var activeSocketIds = [];

io.on('connection', function(socket) {

    activeSocketIds.push(socket.id);

    db.getAnnonate(1, function(err, docs) {
        socket.emit('load old annonation', docs);
    });

    socket.on('add annotations', function(annonateObj) {
        // console.log("***add annotations***");
        // console.log(annonateObj);
        // console.log("***add annotations***");        
        var index = activeSocketIds.indexOf(socket.id);
        annonateObj.inNotParent = true;
        annonateObj.i_by = annonateObj.uuid;

        activeSocketIds.forEach(function(id, i) {
            if (i != index) {
                io.to(id).emit('add annotations', annonateObj);
            }
        })

    });

    socket.on('clear annotations', function(annonateObj) {
        // console.log("***clear annotations***");
        // console.log(annonateObj);
        // console.log("***clear annotations***");
        var index = activeSocketIds.indexOf(socket.id);
        activeSocketIds.forEach(function(id, i) {
            if (i != index) {
                io.to(id).emit('clear annotations', annonateObj);
            }
        })
    });


    socket.on('edit annotations', function(annonateObj) {
        // console.log("***edit annotations***");
        // console.log(annonateObj);
        // console.log("***edit annotations***");
        var index = activeSocketIds.indexOf(socket.id);
        activeSocketIds.forEach(function(id, i) {
            if (i != index) {
                io.to(id).emit('edit annotations', annonateObj);
            }
        });
    })

    socket.on('delete annotations', function(annonateObj) {
        // console.log("***delete annotations***");
        // console.log(annonateObj);
        // console.log("***delete annotations***");
        var index = activeSocketIds.indexOf(socket.id);
        activeSocketIds.forEach(function(id, i) {
            if (i != index) {
                io.to(id).emit('delete annotations', annonateObj);
            }
        });
    });

    socket.on('disconnect', function() {
        var index = activeSocketIds.indexOf(socket.id);
        if (index > -1) {
            activeSocketIds.splice(index, 1);
        }
    });
});

http.listen(port, function() {
    console.log('listening on *:' + port);
});