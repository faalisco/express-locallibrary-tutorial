var BookInstance = require('../models/bookinstance');
var Book = require('../models/book');
var async = require('async');

const { body,validationResult } = require('express-validator/check');
const {sanitizeBody } = require('express-validator/filter');
const bookinstance = require('../models/bookinstance');

// Display list of all BookInstances.
exports.bookinstance_list = function (req, res, nest) {
    BookInstance.find().populate('book').exec(function (err, list_bookinstances){
        if (err){return next(err);}

        //Successful, so render
        res.render('bookinstance_list', {title: 'Book Instance List', bookinstance_list: list_bookinstances});
    });
};

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = function (req, res, next) {
    BookInstance.findById(req.params.id).populate('book').exec(function (err, bookinstance){
        if (err){return next(err);}
        if (bookinstance==null){//no results
            var err = new Error('Book copy not found');
            err.status = 404;
            return next(err);
        }

        //successful, so render
        res.render('bookinstance_detail', {title: 'Copy: '+bookinstance.book.title, bookinstance: bookinstance});
    });
};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = function (req, res, next) {

    Book.find({}, 'title').exec(function(err, books){
        if (err){return next(err);}

        res.render('bookinstance_form', { title: 'Create BookInstance', book_list: books, statuses: BookInstance.schema.path('status').enumValues});
    })
    
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [

    //validate fields
    body('book', 'Book must be specified').trim().isLength({min: 1}),
    body('imprint', 'Imprint must be specified').trim().isLength({ min: 1 }),
    body('due_back', 'Invalid date').optional({ checkFalsy: true}).isISO8601(),

    //sanitize fields
    sanitizeBody('book').escape(),
    sanitizeBody('imprint').escape(),
    sanitizeBody('status').trim().escape(),
    sanitizeBody('due_back').toDate(),


    //process request after validation and sanitization
    (req, res, next) => {


        // Extract the validation errors from request
        var errors = validationResult(req);


        // create a BookInstance object with escaped and trimmed data
        var bookinstance = new BookInstance({

                book: req.body.book,
                imprint: req.body.imprint,
                status: req.body.status,
                due_back: req.body.due_back
        });

        if (!errors.isEmpty()){
            // if There are errors we render form again with sanitized values and error messages.
            Book.find({}, 'title').exec(function (err, books) {
                if (err){return next(err);}

                res.render('bookinstance_form', {title: 'Create BookInstance', book_list: books, selected_book: bookinstance.book._id, errors: errors.array(), bookinstance: bookinstance});
            });
            return;
        }else{
            bookinstance.save(function (err) {
                if (err) { return next(err);}

                res.redirect(bookinstance.url);
            })
        }
    }


];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function (req, res, next) {
   
    BookInstance.findById(req.params.id).exec(function(err, bookinstance){
        if (err){ return next(err); }
        if (bookinstance == null) {
            res.redirect('/catalog/bookinstances');
        }
        res.render('bookinstance_delete', { title: 'Delete Copy', bookinstance: bookinstance });
    });
    
    
};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = function (req, res, next) {
    BookInstance.findById(req.body.copyid).exec(function (err, bookinstance) {

        BookInstance.findByIdAndDelete(req.body.copyid, function deleteCopy(err) {
            if (err) {return next(err);}

            //success
            res.redirect('/catalog/bookinstances');
        });
        
        
    })
};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = function (req, res, next) {

    async.parallel({
        bookinstance: function(callback){
            BookInstance.findById(req.params.id).populate('book').exec(callback);
        },
        books: function (callback) {
            Book.find(callback);
        }
    }, function (err, results) {
        if (err) { return next(err); }
        if (results.bookinstance==null){
            var err = new Error('Copy not found');
            err.status = 404;
            return next(err);
        }
            res.render('bookinstance_form', { title: 'Update Copy', bookinstance: results.bookinstance, book_list: results.books, selected_book: results.bookinstance.book._id, statuses: BookInstance.schema.path('status').enumValues});
    });
    
};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = [


    //validate fields
    body('book', 'Book must be specified').trim().isLength({ min: 1 }),
    body('imprint', 'Imprint must be specified').trim().isLength({ min: 1 }),
    body('due_back', 'Invalid date').optional({ checkFalsy: true }).isISO8601(),

    //sanitize fields
    sanitizeBody('book').escape(),
    sanitizeBody('imprint').escape(),
    sanitizeBody('status').trim().escape(),
    sanitizeBody('due_back').toDate(),

    (req, res, next) => {

        //extract validation errors
        const errors = validationResult(req);

        //create bookinstance object
        var bookinstance = new BookInstance({
            book: req.body.book,
            imprint: req.body.imprint,
            due_back: req.body.due_back,
            status: req.body.status,
            _id: req.params.id
        });

        if (!errors.isEmpty()){

            Book.find({}, 'title').exec(function (err, books) {
                if (err){ return next(err); }

                res.render('bookinstance_form', { title: 'update Copy', books: books, bookinstance: bookinstance, selected_book: bookinstance.book._id, statuses: BookInstance.schema.path('status').enumValues, errors: errors.array() });
            });
            return;
        }else {
            //data valid update copy
            BookInstance.findByIdAndUpdate(req.params.id, bookinstance, {}, function (err, thecopy){
                if (err) { return next(err); }

                res.redirect(thecopy.url);
            });
        }
    }

];