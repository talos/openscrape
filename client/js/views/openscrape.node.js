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

/*jslint browser: true, nomen: true*/
/*global define*/

/**
 * A node view renders a single node information, be it a value or a response.
 */
define([
    'require',
    'text!../../templates/ready.mustache',
    'text!../../templates/match.mustache',
    'text!../../templates/page.mustache',
    'text!../../templates/wait.mustache',
    'text!../../templates/reference.mustache',
    'text!../../templates/missing.mustache',
    'text!../../templates/failed.mustache',
    'lib/d3',
    'lib/requirejs.mustache',
    'lib/underscore',
    'lib/backbone',
    'lib/json2',
    '../openscrape.caustic',
    'lib/jquery'
], function (require, ready, match, page, wait, reference, missing, failed,
             d3, mustache, _, backbone, json, caustic) {
    "use strict";

    var $ = require('jquery'),

        /**
         * Static function to generate an SVG container for a node
         * based off of width and height.
         *
         * @param {Number} width
         * @param {Number} height
         *
         * @return {String} an SVG path description
         */
        containerPath = function (width, height) {
            var top = height / 2,
                bottom = -height / 2;
            return 'M-' + (width / 4) + ' 0' +
                'a' + (width / 4) + ' ' + top + ' 0 0 1 ' + (width / 4) + ' ' + top +
                'a' + (width / 2) + ' ' + (top / 4) + ' 0 0 0 ' + (width / 2) + ' ' + (top / 4) +
                'a' + (width / 2) + ' ' + (top / 4) + ' 0 0 0 ' + (width / 2) + ' -' + (top / 4) +
                'a' + (width / 4) + ' ' + top + ' 0 0 1 ' + (width / 4) + ' -' + top +
                'a' + (width / 4) + ' ' + top + ' 0 0 1 -' + (width / 4) + ' -' + top +
                'a' + (width / 2) + ' ' + (top / 4) + ' 0 0 0 -' + (width / 2) + ' -' + (top / 4) +
                'a' + (width / 2) + ' ' + (top / 4) + ' 0 0 0 -' + (width / 2) + ' ' + (top / 4) +
                'a' + (width / 4) + ' ' + top + ' 0 0 1 -' + (width / 4) + ' ' + top +
                'Z';
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
            'click': 'click'
        },

        // imaginary screen dimensions for iframe rendering
        iframeWidth: 640,
        iframeHeight: 480,

        maxWidth: 320,
        maxHeight: 320,

        initialize: function () {
            this.model.on('change:type', this.render, this);
            this.model.on('change:hidden', this.render, this);
            this.model.on('newTags', this.scrape, this);
            this.d3el = d3.select(this.el);
        },

        click: function (evt) {
            //console.log(json.stringify(this.model, undefined, 2));
            //console.log(this.model.asRequest());
            if (this.model.get('type') === 'wait') {
                this.scrape();
            } if (this.model.get('type') === 'missing') {
                this.scrape();
            } else if (this.model.get('type') === 'failed') {
                // temp debug
                console.log(json.stringify(this.model, undefined, 2));
            } else if (this.model.get('childIds').length > 1) {
                this.model.toggle();
            }
            evt.stopPropagation();
        },

        loading: function () {
            this.$('div').addClass('loading');
        },

        finished: function () {
            this.$('div').removeClass('loading');
        },

        scrape: function (resp) {

            this.model.save('force', true);
            this.loading();

            caustic.scrape(this.model.asRequest())
                .done(_.bind(function (resp) {
                    // todo handle this in store?
                    delete resp.id;
                    this.model.set(resp, {silent: true});
                    this.model.normalize();
                }, this))
                .always(_.bind(function () {
                    this.finished();
                }, this));
        },

        nameIsHTML: function () {
            return (this.model.get('name') || '').trimLeft()[0] === '<';
        },

        name: function () {
            if (this.model.has('description') && this.model.get('description') !== '') {
                return this.model.get('description');
            } else if (this.model.has('name')) {
                //return this.model.get('name').substr(0, 100);
                return this.model.get('name');
            } else {
                return 'No name';
            }
        },

        safeName: function () {
            if (this.model.has('name')) {
                var $parsable = $('<div />').html(this.model.get('name'));
                $parsable.find('a').attr('href', '#');
                return $parsable.html();
            } else {
                return 'No name';
            }
        },

        nameAsDataURI: function () {
            var asURI;
            if (this.model.has('name')) {
                asURI = encodeURIComponent(this.model.get('name'));
            } else {
                asURI = 'no name';
            }
            return 'data:text/html;charset=utf-8,' + asURI;
        },

        render: function () {
            this.d3el
                .selectAll('.node')
                .remove();

            this.d3el
                .selectAll('path')
                .remove();

            // this.d3el
            //     .selectAll('defs')
            //     .remove();

            //var clipId = _.uniqueId('clip'),
            var foreign = this.d3el.append('svg:foreignObject')
                    .classed('node', true)
                    .attr('width', this.iframeWidth)
                    .attr('height', this.iframeHeight),
                $div = $(foreign.append('xhtml:body')
                         .append('div')
                         .classed(this.model.get('type'), true)
                         .classed('hidden', this.model.get('hidden')
                                 )[0])
                    .html(mustache.render(
                        this.templates[this.model.get('type')],
                        _.extend(this.model.toJSON(), this)
                    )),

                // the mustache render produces raw dimensions that must be scaled
                // down.
                rawWidth = $div.width(),
                rawHeight = $div.height(),
                width = rawWidth > this.maxWidth ? this.maxWidth : rawWidth,
                height = rawHeight > this.maxHeight ? this.maxHeight : rawHeight,
                path = containerPath(width, height);

                // clipPath = this.d3el.append('defs')
                //     .append('svg:clipPath')
                //     .attr('id', clipId)
                //     .append('path')
                //     .attr('d', path);

            this.d3el.insert('path', '.node')
                .classed('background', true)
                .attr('d', path);

            this.d3el.append('path')
                .classed('mask', true)
                .attr('d', path);

            this.model.set({
                width: width,
                height: height
            }, {
                silent: true
            });

            // clipPath.attr('transform', function (d) {
            //     var x = d.x < 180 ? 0 : -width,
            //     //var x = 0,
            //         y = height / 2,
            //         rotate = d.x < 180 ? 0 : 180;
            //     return 'rotate(' + rotate + ')translate(' + x + ',' + y + ')';
            // });

            foreign.attr('transform', function (d) {
                var x = d.x < 180 ? 0 : -width,
                    y = -height / 2,
                    rotate = d.x < 180 ? 0 : 180,
                    scaleX = width / rawWidth,
                    scaleY = height / rawHeight;
                return 'rotate(' + rotate + ')' +
                    'translate(' + x + ',' + y + ')' +
                    'scale(' + scaleX + ',' + scaleY + ')';
            }); //.attr('clip-path', 'url(#' + clipId + ')');

            return this;
        }
    });
});
