var mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/pdf-annonate', function(err){	
    if(err) {
		console.log(err);        
	} else {
		console.log('Connected to mongodb!');
	}
});


var annonateSchema = mongoose.Schema({
	i_by: String,	
    u_by: String,	
	created: {type: Date, default: Date.now},
    updated: {type: Date, default: Date.now},
    annonation:[ '[object Object]',          
     '[object Object]' ]
});

var Annonate = mongoose.model('Annonate', annonateSchema);

exports.getAnnonate = function(limit,cb){
	Annonate.findOne({}, function (err, doc){
        cb(err, doc);
    });
    
    // var query = Annonate.find({});
	// query.sort('-created').limit(limit).exec(function(err, docs){
    //     // return docs;
	// 	cb(err, docs);
	// });

}

exports.saveAnnonate = function(data,cb){	
    annonate=Annonate.findOne({}, function (err, doc){       
        if(!doc){
            doc= new Annonate({annonation: data});
        }
        doc.annonation = data;        
        doc.save();        
        
        cb(err, doc);        

    });    
};
exports.editAnnonate = function(data, cb){    

    // var query = { name: 'borne' };
    // Annonate.update(query, { annonation: data.annonate })    

    Annonate.findOne({}, function (err, doc){
        doc.annonation = data.annonate;        
        doc.save();        
    });


};
