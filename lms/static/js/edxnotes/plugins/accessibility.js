;(function (define, undefined) {
'use strict';
define(['jquery', 'underscore', 'annotator_1.2.9'], function ($, _, Annotator) {
    /**
     * Adds the Accessibility Plugin
     **/
    Annotator.Plugin.Accessibility = function () {
        _.bindAll(this,
            'addAriaAttributes', 'onHighlightKeyDown', 'onViewerKeyDown',
            'onEditorKeyDown', 'addDescriptions', 'removeDescription',
            'saveCurrentHighlight', 'focusOnGrabber', 'showViewer', 'onClose'
        );
        // Call the Annotator.Plugin constructor this sets up the element and
        // options properties.
        Annotator.Plugin.apply(this, arguments);
    };

    $.extend(Annotator.Plugin.Accessibility.prototype, new Annotator.Plugin(), {
        pluginInit: function () {
            this.annotator.subscribe('annotationViewerTextField', this.addAriaAttributes);
            this.annotator.subscribe('annotationsLoaded', this.addDescriptions);
            this.annotator.subscribe('annotationCreated', this.addDescriptions);
            this.annotator.subscribe('annotationDeleted', this.removeDescription);
            this.annotator.element.on('keydown.accessibility.hl', '.annotator-hl', this.onHighlightKeyDown);
            this.annotator.element.on('keydown.accessibility.viewer', '.annotator-viewer', this.onViewerKeyDown);
            this.annotator.element.on('keydown.accessibility.editor', '.annotator-editor', this.onEditorKeyDown);
            this.addFocusGrabber();
            this.addTabIndex();
        },

        destroy: function () {
            this.annotator.unsubscribe('annotationViewerTextField', this.addAriaAttributes);
            this.annotator.unsubscribe('annotationsLoaded', this.addDescriptions);
            this.annotator.unsubscribe('annotationCreated', this.addDescriptions);
            this.annotator.unsubscribe('annotationDeleted', this.removeDescription);
            this.annotator.element.off('.accessibility');
            this.removeFocusGrabber();
            this.savedHighlights = null;
        },

        addTabIndex: function () {
            this.annotator.element
                .find('.annotator-edit, .annotator-delete')
                .attr('tabindex', 0);
        },

        addFocusGrabber: function () {
            this.focusGrabber = $('<span />', {
                'class': 'sr edx-notes-focus-grabber',
                'tabindex': '-1',
                'text': gettext('Focus grabber')
            });
            this.annotator.wrapper.before(this.focusGrabber);
        },

        removeFocusGrabber: function () {
            if (this.focusGrabber) {
                this.focusGrabber.remove();
                this.focusGrabber = null;
            }
        },

        focusOnGrabber: function () {
            this.annotator.wrapper.siblings('.edx-notes-focus-grabber').focus();
        },

        addDescriptions: function (annotations) {
            if (!_.isArray(annotations)) {
                annotations = [annotations];
            }

            _.each(annotations, function (annotation) {
                var id = annotation.id || _.uniqueId();

                this.annotator.wrapper.after($('<div />', {
                    'class': 'aria-note-description sr',
                    'id': 'aria-note-description-' + id,
                    'text': Annotator.Util.escape(annotation.text)
                }));

                $(annotation.highlights).attr({
                    'aria-describedby': 'aria-note-description-' + id
                });
            }, this);
        },

        removeDescription: function (annotation) {
            var id = $(annotation.highlights).attr('aria-describedby');
            $('#' + id).remove();
        },

        addAriaAttributes: function (field, annotation) {
            // Add ARIA attributes to associated note ie <div>My note</div>
            $(field).attr({
                'tabindex': -1,
                'role': 'note',
                'class': 'annotator-note'
            });
        },

        saveCurrentHighlight: function (annotation) {
            if (annotation && annotation.highlights) {
                this.savedHighlights = annotation.highlights[0];
            }
        },

        focusOnHighlightedText: function () {
            if (this.savedHighlights) {
                this.savedHighlights.focus();
                this.savedHighlights = null;
            }
        },

        getViewerTabControls: function () {
            var viewer, note, viewerControls, editButton, delButton, closeButton, tabControls = [];

            // Viewer elements
            viewer = this.annotator.element.find('.annotator-viewer');
            note = viewer.find('.annotator-note');
            viewerControls = viewer.find('.annotator-controls');
            editButton = viewerControls.find('.annotator-edit');
            delButton = viewerControls.find('.annotator-delete');
            closeButton = viewerControls.find('.annotator-close');

            tabControls.push(note, editButton, delButton, closeButton);

            return tabControls;
        },

        getEditorTabControls: function () {
            var editor, editorControls, textArea, saveButton, cancelButton, tabControls = [];

            // Editor elements
            editor = this.annotator.element.find('.annotator-editor');
            editorControls = editor.find('.annotator-controls');
            textArea = editor.find('.annotator-listing')
                             .find('.annotator-item')
                             .first()
                             .children('textarea');
            saveButton  = editorControls.find('.annotator-save');
            cancelButton = editorControls.find('.annotator-cancel');

            tabControls.push(textArea, saveButton, cancelButton);

            return tabControls;
        },

        focusOnNextTabControl: function (tabControls, tabControl) {
            var nextIndex;

            _.each(tabControls, function (element, index) {
                if (element.is(tabControl)) {
                    nextIndex = index === tabControls.length - 1 ? 0 : index + 1;
                    tabControls[nextIndex].focus();
                }
            });
        },

        focusOnPreviousTabControl: function (tabControls, tabControl) {
            var previousIndex;
            _.each(tabControls, function (element, index) {
                if (element.is(tabControl)) {
                    previousIndex = index === 0  ? tabControls.length - 1 : index - 1;
                    tabControls[previousIndex].focus();
                }
            });
        },

        showViewer: function (position, annotation) {
            annotation = $.makeArray(annotation);
            this.saveCurrentHighlight(annotation[0]);
            this.annotator.showViewer(annotation, position);
            this.annotator.element.find('.annotator-listing').focus();
            this.annotator.subscribe('annotationDeleted', this.focusOnGrabber);
        },

        onClose: function () {
            this.focusOnHighlightedText();
            this.annotator.unsubscribe('annotationDeleted', this.focusOnGrabber);
        },

        onHighlightKeyDown: function (event) {
            var KEY = $.ui.keyCode,
                keyCode = event.keyCode,
                target = $(event.currentTarget),
                annotation, position;

            switch (keyCode) {
                case KEY.TAB:
                    // This happens only when coming from notes page
                    if (this.annotator.viewer.isShown()) {
                        this.annotator.element.find('.annotator-listing').focus();
                    }
                    break;
                case KEY.ENTER:
                case KEY.SPACE:
                    if (!this.annotator.viewer.isShown()) {
                        position = target.position();
                        this.showViewer(position, target.data('annotation'));
                    }
                    break;
                case KEY.ESCAPE:
                    this.annotator.viewer.hide();
                    break;
            }
            // We do not stop propagation and default behavior on a TAB keypress
            if (event.keyCode !== KEY.TAB || (event.keyCode === KEY.TAB && this.annotator.viewer.isShown())) {
                event.preventDefault();
                event.stopPropagation();
            }
        },

        onViewerKeyDown: function (event) {
            var KEY = $.ui.keyCode,
                keyCode = event.keyCode,
                target = $(event.target),
                listing = this.annotator.element.find('.annotator-listing'),
                tabControls;

            switch (keyCode) {
                case KEY.TAB:
                    tabControls = this.getViewerTabControls();
                    if (event.shiftKey) { // Tabbing backwards
                        if (target.is(listing)) {
                            _.last(tabControls).focus();
                        }
                        else {
                            this.focusOnPreviousTabControl(tabControls, target);
                        }
                    } else { // Tabbing forward
                        if (target.is(listing)) {
                            _.first(tabControls).focus();
                        }
                        else {
                            this.focusOnNextTabControl(tabControls, target);
                        }
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    break;
                case KEY.ENTER:
                case KEY.SPACE:
                    if (target.hasClass('annotator-close')) {
                        this.annotator.viewer.hide();
                        this.onClose();
                        event.preventDefault();
                    }
                    break;
                case KEY.ESCAPE:
                    this.annotator.viewer.hide();
                    this.onClose();
                    event.preventDefault();
                    break;
            }
        },

        onEditorKeyDown: function (event) {
            var KEY = $.ui.keyCode,
                keyCode = event.keyCode,
                target = $(event.target),
                editor, form, editorControls, save, cancel,
                tabControls;

            editor = this.annotator.element.find('.annotator-editor');
            form = editor.find('.annotator-widget');
            editorControls = editor.find('.annotator-controls');
            save  = editorControls.find('.annotator-save');
            cancel = editorControls.find('.annotator-cancel');

            switch (keyCode) {
                case KEY.TAB:
                    tabControls = this.getEditorTabControls();
                    if (event.shiftKey) { // Tabbing backwards
                        if (target.is(form)) {
                            _.last(tabControls).focus();
                        } else {
                            this.focusOnPreviousTabControl(tabControls, target);
                        }
                    } else { // Tabbing forward
                        if (target.is(form)) {
                            _.first(tabControls).focus();
                        } else {
                            this.focusOnNextTabControl(tabControls, target);
                        }
                    }
                    event.preventDefault();
                    event.stopPropagation();
                    break;
                case KEY.ENTER:
                    if (target.is(save) || event.metaKey || event.ctrlKey) {
                        this.annotator.editor.submit();
                    } else if (target.is(cancel)) {
                        this.annotator.editor.hide();
                    } else {
                        break;
                    }
                    this.onClose();
                    event.preventDefault();
                    break;
                case KEY.SPACE:
                    if (target.is(save)) {
                        this.annotator.editor.submit();
                    } else if (target.is(cancel)) {
                        this.annotator.editor.hide();
                    } else {
                        break;
                    }
                    this.onClose();
                    event.preventDefault();
                    break;
                case KEY.ESCAPE:
                    this.annotator.editor.hide();
                    this.onClose();
                    event.preventDefault();
                    break;
            }
        }
    });
});
}).call(this, define || RequireJS.define);
