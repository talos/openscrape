/***
   * Copyright (c) 2012 John Krauss.
   *
   * This file is part of Openscrape.
   *
   * Openscrape is free software: you can redistribute it and/or modify
   * it under the terms of the GNU General Public License as published by
   * the Free Software Foundation, either version 3 of the License, or
   * (at your option) any later version.
   *
   * Openscrape is distributed in the hope that it will be useful,
   * but WITHOUT ANY WARRANTY; without even the implied warranty of
   * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   * GNU General Public License for more details.
   *
   * You should have received a copy of the GNU General Public License
   * along with Openscrape.  If not, see <http://www.gnu.org/licenses/>.
   *
   ***/

/*jslint nomen: true, regexp: true*/
/*global define*/

/**
 * A node view renders a single node information, be it a value or a response.
 */
define([
    'require',
    'text!templates/ready.mustache',
    'text!templates/loaded_value.mustache',
    'text!templates/found_value.mustache',
    'text!templates/wait.mustache',
    'text!templates/reference.mustache',
    'text!templates/missing.mustache',
    'text!templates/failed.mustache',
    'lib/d3',
    'lib/requirejs.mustache',
    'lib/underscore',
    'lib/backbone',
    '../openscrape.caustic',
    'lib/jquery'
], function (require, ready, loaded_value, found_value,
    wait, reference, missing, failed, d3, mustache, _, backbone, caustic) {
    "use strict";
    var $ = require('jquery'),

        padding = 20,

        /**
         * @return How much a width should be lead by.
         */
        lead = function (x) { return x / 4; },
        /**
         * Static function to generate an SVG container for a node
         * based off of width and height.
         *
         * @param {Number} contentWidth
         * @param {Number} contentHeight
         *
         * @return {String} an SVG path description
         */
        containerPath = function (contentWidth, contentHeight) {
            var height = contentHeight + padding,
                w = contentWidth + padding,
                top = height / 2,
                bottom = -height / 2;
            return 'M0 0' +
                'a' + lead(w) + ' ' + top + ' 0 0 1 ' + lead(w) + ' ' + top +
                'a' + (w / 2) + ' ' + (top / 2) + ' 0 0 0 ' + (w / 2) + ' ' + (top / 2) +
                'a' + (w / 2) + ' ' + (top / 2) + ' 0 0 0 ' + (w / 2) + ' -' + (top / 2) +
                'a' + lead(w) + ' ' + top + ' 0 0 1 ' + lead(w) + ' -' + top +
                'a' + lead(w) + ' ' + top + ' 0 0 1 -' + lead(w) + ' -' + top +
                'a' + (w / 2) + ' ' + (top / 2) + ' 0 0 0 -' + (w / 2) + ' -' + (top / 2) +
                'a' + (w / 2) + ' ' + (top / 2) + ' 0 0 0 -' + (w / 2) + ' ' + (top / 2) +
                'a' + lead(w) + ' ' + top + ' 0 0 1 -' + lead(w) + ' ' + top +
                'Z';
        },

        /**
         * Do some very basic cleaning of the most problematic elements.
         * Not a security feature.
         */
        cleanHTML = function (html) {
            return html.replace(/<script.*?>[\s\S]*?<\/.*?script>/ig, '')
                .replace(/<img.*?>/ig, '')
            //.replace(/<style.*?>[\s\S]*?<\/.*?style>/ig, '')
                .replace(/<link.*?>[\s\S]*?<\/.*?link>/ig, '');

        };

    return backbone.View.extend({

        templates: {
            found_value: found_value,
            loaded_value: loaded_value,
            loaded: ready,
            found: ready,
            wait: wait,
            reference: reference,
            missing: missing,
            failed: failed
        },

        events: {
            'click .mask ': 'click',
            'mouseenter .mask': 'mouseEnter',
            'mouseleave .mask': 'mouseLeave'
        },

        // imaginary screen dimensions for iframe rendering
        iframeWidth: 640,
        iframeHeight: 480,

        maxWidth: 320,
        maxHeight: 320,

        initialize: function (options) {
            this.model.on('change:highlight', this.highlight, this);
            this.model.on('change:type', this.render, this);
            this.model.on('change:missing', this.scrape, this);
            if (this.model.type() === 'missing' && this.model.get('missing').length === 0) {
                this.scrape();
            }
            this.d3el = d3.select(this.el).classed('node', true);
        },

        remove: function () {
            backbone.View.prototype.remove.call(this);
            this.model.off('change:highlight', this.highlight, this);
            this.model.off('change:type', this.render, this);
            this.model.off('change:missing', this.scrape, this);
        },

        /**
         * Highlight ancestors
         */
        mouseEnter: function (evt) {
            //_.invoke(this.model.ancestors(), 'set', 'highlight', true);
        },

        /**
         * Unhighlight ancestors
         */
        mouseLeave: function (evt) {
            //_.invoke(this.model.ancestors(), 'set', 'highlight', false);
        },

        highlight: function () {
            if (this.background) {
                this.background.classed('highlight', this.model.get('highlight') === true);
            }
        },

        click: function (evt) {
            //this.model.edit();
            //console.log(this.model.toJSON());
            if (this.model.type() === 'wait') {
                this.model.save('force', true);
                this.scrape();
            } else if (this.model.get('childIds').length > 1) {
                this.model.toggle();
            }
            evt.stopPropagation();
        },

        scrape: function () {
            if (this.model.type() === 'wait' ||
                     (this.model.type() === 'missing' &&
                      this.model.get('missing').length === 0)) {
                var request = this.model.asRequest();
                //console.log('scraping'); // todo svg animation
                caustic.scrape(request, this.$el.closest('div'))
                    .done(_.bind(function (resp) {
                        // todo handle this in store?
                        delete resp.id;
                        this.model.set(resp, {silent: true});
                        this.model.normalize();
                    }, this))
                    .fail(_.bind(function (error) {
                        this.model.trigger('error', this.model, error);
                    }, this))
                    .always(_.bind(function () {
                        //console.log('done scraping'); // todo svg animation
                    }, this));
            }
        },

        nameIsHTML: function () {
            return (this.model.get('name') || '').trimLeft()[0] === '<';
        },

        name: function () {
            if (this.model.has('description') && this.model.get('description') !== '') {
                return this.model.get('description');
            } else if (this.model.has('name')) {
                //return this.model.get('name').substr(0, 100);
                return cleanHTML(this.model.get('name'));
            } else {
                return 'No name';
            }
        },

        nameAsDataURI: function () {
            var asURI,
                preparse;
            if (this.model.has('name')) {
                preparse = cleanHTML(this.model.get('name'));

                asURI = encodeURIComponent(preparse);
            } else {
                asURI = 'no name';
            }
            //return 'data:text/html;charset=utf-8,' + asURI;
            return 'data:text/html,' + asURI;
        },

        render: function () {
            this.d3el.selectAll('*').remove();

            this.container = this.d3el.append('g')
                .classed('container', true);
            this.foreign = this.container.append('svg:foreignObject')
                .classed('foreign', true)
                .attr('width', this.iframeWidth)
                .attr('height', this.iframeHeight);

            var $div = $(this.foreign.append('xhtml:body')
                         .append('div')[0])
                    .html(mustache.render(
                        this.templates[this.model.get('type')],
                        _.extend(this.model.toJSON(), this)
                    )),

                // the mustache render produces raw dimensions that must be scaled
                // down.
                rawWidth = $div.width(),
                rawHeight = $div.height(),
                contentWidth = rawWidth > this.maxWidth ? this.maxWidth : rawWidth,
                contentHeight = rawHeight > this.maxHeight ? this.maxHeight : rawHeight,
                width = contentWidth + (padding * 2) + (lead(contentWidth) * 2),
                height = contentHeight + (padding * 2),
                path = containerPath(contentWidth, contentHeight),
                scaleX = contentWidth / rawWidth,
                scaleY = contentHeight / rawHeight;

            this.background = this.d3el.insert('path', '.container')
                .classed('background', true)
                .classed(this.model.get('type'), true)
                .classed('hidden', !this.model.expanded())
                .attr('d', path);

            this.d3el.append('path')
                .classed('mask', true)
                .classed(this.model.get('type'), true)
                .classed('hidden', !this.model.expanded())
                .attr('d', path);
                // .append('svg:animate')
                // .attr('svg:attributeType', 'CSS')
                // .attr('svg:attributeName', 'opacity')
                // .attr('svg:begin', '0s')
                // .attr('svg:dur', '1s')
                // .attr('svg:from', '0')
                // .attr('svg:to', '1')
                // .attr('svg:repeatCount', 'indefinite');

            this.model.width(width);
            this.model.height(height);

            this.container
                .attr('transform',
                      'translate(' + (lead(contentWidth) + padding) + ',' + (-contentHeight / 2) + ')' +
                      'scale(' + scaleX + ',' + scaleY + ')');

            return this;
        }
    });
});
