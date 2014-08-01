(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(require('jquery'));
    } else {
        root.PathCollapser = factory(root.jQuery);
    }
}(this, function (jQuery) {
    var $ = jQuery;

    /**
     * The PathCollapser is capable of collapsing a segmented String (A string divided
     * by certain characters) into a smaller variant, until it fits into a given pixel
     * margin
     *
     * @param {Array<String>} dividers
     * @constructor
     */
    var PathCollapser = function(dividers) {
        /**
         * Dividers used to split up and shorten the given string
         *
         * @type {Array.<String>}
         * @private
         */
        this.dividers_ = dividers;


        var dividerRegExpPart = dividers.join("|")
            .replace("\\", "\\\\");

        /**
         * Regular Expression based on the given divider used to split up the
         * content
         *
         * @type {RegExp}
         * @private
         */
        this.dividerRegExp_ = new RegExp(
            "^(.+?)(" + dividerRegExpPart + ")(.*)$"
        );
    };

    /**
     * Collapse the given Text to fit into the given element.
     *
     * If no fitting string version could be found `null` is returned.
     *
     * @param {Element} element
     * @param {String} content
     *
     * @return {String|null}
     */
    PathCollapser.prototype.collapseInto = function(element, content) {
        var $virtualClone;

        var result = (function() {
            var $element = $(element);
            var maximumInnerWidth = $element.innerWidth();

            $virtualClone = $element.clone();
            $virtualClone.css({
                position: "absolute",
                visibility: "hidden",
                top: "-99999px",
                left: "-99999px",
                width: "initial",
                maxWidth: "initial",
                minWidth: "initial",
                overflow: "initial"
            });

            $("body").append($virtualClone);

            // Maybe it already does fit uncollapsed?
            $virtualClone.text(content);
            if ($virtualClone.innerWidth() <= maximumInnerWidth) {
                return content;
            }

            var match;
            var contentToBeProcessed = content;
            var collapsedSegment;
            var alreadyCollapsed = "";
            while ((match = contentToBeProcessed.match(this.dividerRegExp_)) !== null) {
                collapsedSegment = this.tryAndFitSegment_(
                    $virtualClone,
                    maximumInnerWidth,
                    alreadyCollapsed,
                    match[1],
                    match[2] + match[3]
                );

                if (collapsedSegment !== false) {
                    return alreadyCollapsed + collapsedSegment + match[2] + match[3];
                } else {
                    alreadyCollapsed += this.collapseContent_(match[1], 1) + match[2];
                    contentToBeProcessed = match[3]
                }
            }

            // Still not fitting in start "shortening the last segment until it fits
            collapsedSegment = this.tryAndFitSegment_($virtualClone, maximumInnerWidth, alreadyCollapsed, content, "");
            if (collapsedSegment === false) {
                // We are giving up as we can't find a matching length and return null
                return null;
            }

            return alreadyCollapsed + collapsedSegment;
        }.bind(this))();

        $virtualClone.remove();
        return result;
    };

    /**
     * Collapse the given ContentSegment to a specific length
     *
     * @param {String} content
     * @param {Number} targetLength
     * @return {String}
     * @private
     */
    PathCollapser.prototype.collapseContent_ = function(content, targetLength) {
        switch (targetLength) {
            case 0:
                return "";
            case 1:
                return content.substr(0, 1) + "…";
            case content.length:
                return content;
            default:
                return content.substr(0, 1) + "…" + content.substring(content.length - targetLength + 1, content.length);
        }
    };

    PathCollapser.prototype.fitsIntoWidth_ = function($container, maximumInnerWidth, content) {
        $container.text(content);
        return $container.innerWidth() <= maximumInnerWidth;
    };

    PathCollapser.prototype.tryAndFitSegment_ = function($container, maximumInnerWidth, prefix, segment, suffix) {
        var i;
        var collapsedContent;
        for (i=segment.length; i>0; i--) {
            collapsedContent = this.collapseContent_(segment, i);
            if (this.fitsIntoWidth_($container, maximumInnerWidth, prefix + collapsedContent + suffix)) {
                return collapsedContent;
            }
        }

        return false;
    };


    var requestAnimFrame = (function(){
        return  window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            function( callback ) {
                window.setTimeout(callback, 1);
            };
    })();

    var collapsePathTargets = [];
    jQuery.fn.collapsePath = function(dividers) {
        var collapser = new PathCollapser(dividers);
        return $(this).each(function(index, target) {
            var $target = $(target);
            if (collapsePathTargets.length === 0) {
                $(window).on("resize.collapsePath", $.debounce(500, function(e) {
                    requestAnimFrame(function() {
                        collapsePathTargets.forEach(function($target) {
                            $target.text(collapser.collapseInto($target, $target.data("uncollapsed-text")));
                        });
                    });
                }));
            }
            collapsePathTargets.push($target);

            $target.data("uncollapsed-text", $target.text().trim());
            $target.text(collapser.collapseInto($target, $target.data("uncollapsed-text")));
        });
    };

    return PathCollapser;
}));
