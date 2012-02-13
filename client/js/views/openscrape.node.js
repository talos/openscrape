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

    var $ = require('jquery');

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

        initialize: function () {
            this.model.on('change:type', this.render, this);
            this.model.on('change:hidden', this.render, this);
            this.model.on('newTags', this.scrape, this);
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
            d3.select(this.el)
                .selectAll('.node')
                .remove();

            var el = d3.select(this.el),
                foreign = el.append('svg:foreignObject')
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
                width = $div.width(),
                height = $div.height(),

                rect = el.append('rect')
                    .classed('mask', true)
                    .attr('width', width)
                    .attr('height', height);

            this.model.set({
                width: width,
                height: height
            }, {
                silent: true
            });

            foreign.attr('transform', _.bind(function (d) {
                var x = d.x < 180 ? 0 : -width,
                    y = -height / 2,
                    rotate = d.x < 180 ? 0 : 180;
                return 'rotate(' + rotate + ')translate(' + x + ',' + y + ')';
            }, this));

            return this;
        }
    });
});
