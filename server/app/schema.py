BASE = {
    "type" : "object",
    "properties": {
        "name" : {
            "description" : "The name of this instruction.  If this is specified, its results will be saved under this name.  The results will also be used for substitutions using this name.",
            "type" : "string",
            "required" : False
        },
        "description" : {
            "description" : "String description of this instruction.",
            "type" : "string",
            "required" : False
        },
        "metadata" : {
            "description" : "An optional hash of metadata about this instruction.",
            "type" : "object",
            "required" : False
        },
    },
    "additionalProperties": False
}

LOAD_PROPERTIES = {
    "load" : {
        "description" : "The URL this instruction will load its result from.  Mustache substitutions are performed on this.",
        "type" : "string",
        "required" : True
    },
    "method" : {
        "description" : "The HTTP method that should be used by this load.",
        "type" : "string",
        "enum" : ["head", "get", "post"],
        "dependencies" : "load",
        "required" : False
    },
    "posts"   : {
        "description" : "Post data for this load.  Can either be name-value pairs or a string.  Mustache substitutions are performed either way.",
        "type" : ["object", "string"],
        "dependencies" : "load",
        "required" : False
    },
    "headers" : {
        "description" : "A set of name-value pairs that will be used as extra headers for this particular load.  Mustache substitutions are performed on both the name and value.",
        "type" : "object",
        "dependencies" : "load",
        "required" : False
    },
    "cookies": {
        "description" : "A set of name-value pairs that will be used as extra cookies for this particular load.  Mustache substitutions are performed on both the name and value.",
        "type" : "object",
        "dependencies" : "load",
        "required" : False
    }
}

FIND_PROPERTIES = {
    "find": {
        "description" : "The regular expression this instruction will use to find result(s) from its source.  Mustache substitutions are performed on this.",
        "type" : "string",
        "required" : True 
    },
    "case_insensitive" : {
        "description" : "Whether this pattern is case-sensitive.",
        "type" : "boolean",
        "required" : False,
        "default" : False
    },
    "multiline" : {
        "description" : "Whether ^ and $ should match at the start and end of each line.",
        "type" : "boolean",
        "required" : False,
        "default" : False
    },
    "dot_matches_all" : {
        "description" : "Whether . should match all characters, including newlines.",
        "type" : "boolean",
        "required" : False,
        "default" : True
    },
    "replace" : {
        "description" : "The replacement applied to each of the pattern's matches.  Backreferences from $0 to $9 can be used.  Mustache substitutions are applied.",
        "type" : "string",
        "default" : "$0",
        "required" : False
    },
    "match" : {
        "description" : "The index of a single find match to send to replace.  Exclusive of min and max.  0 is first and positive numbers count forwards; -1 is last and negative numbers count backwards.",
        "type" : "integer",
        "required" : False
    },
    "min" : {
        "description" : "The index of the first find match to send to replace.  Exclusive of match.  0 is first and positive numbers count forwards; -1 is last and negative numbers count backwards.",
        "type" : "integer",
        "default" : 0,
        "required" : False
    },
    "max" : {
        "description" : "The index of the last match to send to replace.  Exclusive of min and max.  0 is first and positive numbers count forwards; -1 is last and negative numbers count backwards.",
        "type" : "integer",
        "default" : -1,
        "required" : False
    }
}

LOAD = dict(BASE)
LOAD['properties'] = dict(LOAD['properties'].items() + LOAD_PROPERTIES.items())

FIND = dict(BASE)
FIND['properties'] = dict(FIND['properties'].items() + FIND_PROPERTIES.items())

INSTRUCTION = {
    "description" : "A Caustic instruction",
    "type" : ["string", "array", LOAD, FIND],
    "items": {
        "type" : ["string", LOAD, FIND]
    }
}

THEN = {
    "description" : "A Caustic instruction to run after.",
    "required" : False,
    "type": INSTRUCTION
}

LOAD['properties']['then'] = THEN
FIND['properties']['then'] = THEN

