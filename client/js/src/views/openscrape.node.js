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

/*jslint nomen: true*/
/*global define*/

/**
 * A node view renders a single node information, be it a value or a response.
 */
define([
    'require',
    'text!templates/ready.mustache',
    'text!templates/match.mustache',
    'text!templates/page.mustache',
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
], function (require, ready, match, page, wait, reference, missing, failed,
             d3, mustache, _, backbone, caustic) {
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
                width = contentWidth + padding,
                top = height / 2,
                bottom = -height / 2;
            return 'M0 0' +
                'a' + lead(width) + ' ' + top + ' 0 0 1 ' + lead(width) + ' ' + top +
                'a' + (width / 2) + ' ' + (top / 2) + ' 0 0 0 ' + (width / 2) + ' ' + (top / 2) +
                'a' + (width / 2) + ' ' + (top / 2) + ' 0 0 0 ' + (width / 2) + ' -' + (top / 2) +
                'a' + lead(width) + ' ' + top + ' 0 0 1 ' + lead(width) + ' -' + top +
                'a' + lead(width) + ' ' + top + ' 0 0 1 -' + lead(width) + ' -' + top +
                'a' + (width / 2) + ' ' + (top / 2) + ' 0 0 0 -' + (width / 2) + ' -' + (top / 2) +
                'a' + (width / 2) + ' ' + (top / 2) + ' 0 0 0 -' + (width / 2) + ' ' + (top / 2) +
                'a' + lead(width) + ' ' + top + ' 0 0 1 -' + lead(width) + ' ' + top +
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
            match: match,
            page: page,
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
            this.model.on('change:scraping change:hidden', this.render, this);
            this.d3el = d3.select(this.el);
        },

        /**
         * Highlight ancestors
         */
        mouseEnter: function (evt) {
            _.invoke(this.model.ancestors(), 'set', 'highlight', true);
        },

        /**
         * Unhighlight ancestors
         */
        mouseLeave: function (evt) {
            _.invoke(this.model.ancestors(), 'set', 'highlight', false);
        },

        highlight: function () {
            this.d3el.select('.background')
                .classed('highlight', this.model.get('highlight') === true);
        },

        click: function (evt) {
            this.model.edit();

            if (this.model.get('type') === 'wait') {
                //console.log(this.model);
                this.model.save('force', true);
                this.model.scrape();
            } else if (this.model.get('type') === 'missing') {
                this.model.scrape();
            } else if (this.model.get('childIds').length > 1) {
                this.model.toggle();
            }
            evt.stopPropagation();
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
            this.d3el
                .selectAll('.node')
                .remove();

            this.d3el
                .selectAll('path')
                .remove();

            var container = this.d3el.append('g')
                    .classed('container', true),
                foreign = container.append('svg:foreignObject')
                    .classed('node', true)
                    .attr('width', this.iframeWidth)
                    .attr('height', this.iframeHeight),
                $div = $(foreign.append('xhtml:body')
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
                path = containerPath(contentWidth, contentHeight);

            if (this.model.scraping()) {
                $div.addClass('loading');
            } else {
                $div.removeClass('loading');
            }

            this.d3el.insert('path', '.container')
                .classed('background', true)
                .classed(this.model.get('type'), true)
                .classed('hidden', this.model.get('hidden'))
                .attr('d', path);

            this.d3el.append('path')
                .classed('mask', true)
                .classed(this.model.get('type'), true)
                .classed('hidden', this.model.get('hidden'))
                .attr('d', path);
                // .append('svg:animate')
                // .attr('svg:attributeType', 'CSS')
                // .attr('svg:attributeName', 'opacity')
                // .attr('svg:begin', '0s')
                // .attr('svg:dur', '1s')
                // .attr('svg:from', '0')
                // .attr('svg:to', '1')
                // .attr('svg:repeatCount', 'indefinite');

            this.model.set({
                width: width,
                height: height
            }, {
                silent: true
            });

            //this.d3el.select('.node')
            container.attr('transform', function (d) {
                var x = d.x < 179.99 ? lead(contentWidth) + padding : -(padding + contentWidth + lead(contentWidth)),
                //var x = lead(contentWidth) + padding,
                    y = -(contentHeight / 2),
                    scaleX = contentWidth / rawWidth,
                    scaleY = contentHeight / rawHeight;
                return 'rotate(' + (d.x > 179.9 ? 180 : 0) + ')' +
                    'translate(' + x + ',' + y + ')' +
                    'scale(' + scaleX + ',' + scaleY + ')';
            });

            //this.rotate();

            return this;
        },

        /**
         * Rotate content rightside up.
         */
        rotate: function () {
            // var x = this.model.width() / 2,
            //     y = this.model.height() / 2;

            this.d3el.select('.node')
                // .transition()
                // .duration(100)
                .attr('transform', function (d) {
                    var x = $(this).width(),
                        y = $(this).height();
                    return 'translate(' + x + ',' + y + ')' +
                        'rotate(' + (d.x > 179.99 ? 0 : 180) + ')';
                    //'rotate(' + (d.x > 179.99 ? 0 : 180) + ')';
                });

            return this;
        }
    });
});
