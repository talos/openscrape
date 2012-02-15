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

/*global define*/

define(function () {
    "use strict";

    /**
     * Convert borough to zip.  Temporary.
     */
    return function (zip) {
        return {
            '10301': '5',
            '10302': '5',
            '10303': '5',
            '10304': '5',
            '10305': '5',
            '10306': '5',
            '10307': '5',
            '10308': '5',
            '10309': '5',
            '10310': '5',
            '10311': '5',
            '10312': '5',
            '10314': '5',
            '10001': '1',
            '10002': '1',
            '10003': '1',
            '10004': '1',
            '10005': '1',
            '10006': '1',
            '10007': '1',
            '10463': '1',
            '10009': '1',
            '10010': '1',
            '10011': '1',
            '10012': '1',
            '10013': '1',
            '10014': '1',
            '10016': '1',
            '10017': '1',
            '10018': '1',
            '10019': '1',
            '10020': '1',
            '10021': '1',
            '10022': '1',
            '10023': '1',
            '10024': '1',
            '10025': '1',
            '10026': '1',
            '10027': '1',
            '10028': '1',
            '10029': '1',
            '10030': '1',
            '10031': '1',
            '10032': '1',
            '10033': '1',
            '10034': '1',
            '10035': '1',
            '10036': '1',
            '10037': '1',
            '10038': '1',
            '10039': '1',
            '10040': '1',
            '10044': '1',
            '10065': '1',
            '10069': '1',
            '10075': '1',
            '10110': '1',
            '10111': '1',
            '10112': '1',
            '10119': '1',
            '10128': '1',
            '10162': '1',
            '10165': '1',
            '10168': '1',
            '10170': '1',
            '10171': '1',
            '10172': '1',
            '10199': '1',
            '10278': '1',
            '10280': '1',
            '10282': '1',
            '11234': '3',
            '11235': '3',
            '11236': '3',
            '11237': '3',
            '11238': '3',
            '11239': '3',
            '11201': '3',
            '11203': '3',
            '11204': '3',
            '11205': '3',
            '11206': '3',
            '11207': '3',
            '11208': '3',
            '11425': '3',
            '11209': '3',
            '11210': '3',
            '11211': '3',
            '11212': '3',
            '11213': '3',
            '11214': '3',
            '11215': '3',
            '11216': '3',
            '11217': '3',
            '11218': '3',
            '11219': '3',
            '11220': '3',
            '11221': '3',
            '11222': '3',
            '11223': '3',
            '11224': '3',
            '11225': '3',
            '11226': '3',
            '11228': '3',
            '11229': '3',
            '11230': '3',
            '11231': '3',
            '11232': '3',
            '11233': '3',
            '11354': '4',
            '11355': '4',
            '11356': '4',
            '11357': '4',
            '11358': '4',
            '11359': '4',
            '11360': '4',
            '11361': '4',
            '11362': '4',
            '11363': '4',
            '11364': '4',
            '11365': '4',
            '11366': '4',
            '11367': '4',
            '11368': '4',
            '11369': '4',
            '11370': '4',
            '11371': '4',
            '11372': '4',
            '11373': '4',
            '11374': '4',
            '11375': '4',
            '11377': '4',
            '11691': '4',
            '11692': '4',
            '11693': '4',
            '11694': '4',
            '11697': '4',
            '11001': '4',
            '11003': '4',
            '11004': '4',
            '11005': '4',
            '11378': '4',
            '11379': '4',
            '11385': '4',
            '11411': '4',
            '11412': '4',
            '11413': '4',
            '11414': '4',
            '11040': '4',
            '11101': '4',
            '11102': '4',
            '11103': '4',
            '11104': '4',
            '11105': '4',
            '11106': '4',
            '11415': '4',
            '11416': '4',
            '11417': '4',
            '11418': '4',
            '11419': '4',
            '11420': '4',
            '11421': '4',
            '11422': '4',
            '11109': '4',
            '11423': '4',
            '11424': '4',
            '11426': '4',
            '11427': '4',
            '11428': '4',
            '11429': '4',
            '11430': '4',
            '11432': '4',
            '11433': '4',
            '11434': '4',
            '11435': '4',
            '11436': '4',
            '11451': '4',
            '10454': '2',
            '10455': '2',
            '10456': '2',
            '10457': '2',
            '10458': '2',
            '10459': '2',
            '10460': '2',
            '10461': '2',
            '10462': '2',
            //'10463': '2', // also in manhattan
            '10464': '2',
            '10465': '2',
            '10466': '2',
            //'11370': '2', // also in queens
            '10467': '2',
            '10468': '2',
            '10469': '2',
            '10470': '2',
            '10471': '2',
            '10472': '2',
            '10473': '2',
            '10474': '2',
            '10475': '2',
            '10451': '2',
            '10452': '2',
            '10453': '2'
        }[zip];
    };
});
