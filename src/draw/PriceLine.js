import EventEmitter from 'event-emitter-es6';
import CIQ from 'chartiq';
import { createElement } from '../components/ui/utils';
import html from './PriceLine.html';
import Line from './Line';

class PriceLine extends Line {
    static get COLOR_GREEN() { return 'green'; }
    static get COLOR_RED() { return 'red'; }
    static get EVENT_PRICE_CHANGED() { return 'EVENT_PRICE_CHANGED'; }

    constructor({
        stx,
        lineColor = PriceLine.COLOR_GREEN,
        relative = false,
        visible = true,
        pipSize = 2,
        price,
        draggable = true,
    }) {
        super({
            stx, lineColor, visible, pipSize, draggable,
        });
        const element = createElement(html);
        this._line.appendChild(element);
        this._priceText = $$$('.price', element);
        this._emitter = new EventEmitter();
        CIQ.appendClassName(this._line, 'horizontal');

        this._stx.append('draw', this._draw.bind(this));

        this._currentPrice = this._stx.currentQuote().Close;
        this._price = price || (relative ? 0 : this._currentPrice);

        this._stx.prepend('updateChartData', (appendQuotes) => {
            this._currentPrice = appendQuotes[appendQuotes.length - 1].Close;
        });

        this._relative = relative;
    }

    get relative() {
        return this._relative;
    }

    set relative(value) {
        if (this._relative === value) return;

        this._relative = value;

        if (this._relative) {
            this._price -= this._currentPrice; // absolute to relative
        } else {
            this._price += this._currentPrice; // relative to absolute
        }
    }

    // override to limit drag movement
    constrainPrice(price) {
        return price;
    }

    _startDrag(e) {
        super._startDrag(e);
        this._initialPosition = CIQ.stripPX(this._line.style.top);
    }

    _dragLine(e) {
        const newTop = this._initialPosition + e.displacementY;
        const newCenter = newTop + (this._line.offsetHeight / 2);
        let newPrice = this._priceFromLocation(newCenter);

        newPrice = this.constrainPrice(newPrice);
        if (this.relative) newPrice -= this._currentPrice;

        this.price = this._snapPrice(newPrice);
        this._draw();
    }

    _snapPrice(price) {
        // snap the limit price to the desired interval if one defined
        let minTick = this._stx.chart.yAxis.minimumPriceTick;
        if (!minTick) minTick = 0.00000001; // maximum # places
        let numToRoundTo = 1 / minTick;
        price = Math.round(price * numToRoundTo) / numToRoundTo;

        return price;
    }

    _locationFromPrice(p) {
        return (
            this._stx.pixelFromPrice(p, this._chart.panel) -
            this._chart.panel.top
        );
    }

    _priceFromLocation(y) {
        let price = this._stx.valueFromPixel(
            y + this._chart.panel.top,
            this._chart.panel,
        );

        return this._snapPrice(price);
    }

    /**
     * Positions nodes at the given price.
     * @param  {number} price       The price (relative to the y-axis)
     * @param  {array} nodes       An array of nodes to move to the desired location
     * @param  {string} [where]       If either "top" or "bottom", then the node will not be allowed to overlap the noOverlap nodes
     * @param  {array} [noOverlap]   An array of nodes which cannot be overlapped
     * @param  {boolean} [keepOnChart] If true then the nodes will not be allowed to move off the chart
     */
    _positionAtPrice(price, nodes, where, noOverlap, keepOnChart) {
        if (!where) where = 'center';
        let px = this._locationFromPrice(price),
            node;
        for (let i = 0; i < nodes.length; i++) {
            node = nodes[i];
            let top = null;
            let j,
                oNode;
            if (where === 'center') {
                top = (px - (node.offsetHeight / 2));
            } else if (where === 'top') {
                if (noOverlap) {
                    for (j = 0; j < noOverlap.length; j++) {
                        oNode = noOverlap[j];
                        let bottom = CIQ.stripPX(oNode.style.top) + oNode.offsetHeight;
                        if (bottom > px) px = bottom;
                    }
                }
                top = Math.round(px) + 1;
            } else if (where === 'bottom') {
                if (noOverlap) {
                    for (j = 0; j < noOverlap.length; j++) {
                        oNode = noOverlap[j];
                        top = CIQ.stripPX(oNode.style.top);
                        if (px > top) px = top;
                    }
                }
                top = Math.round(px - node.offsetHeight);
            }
            node.removeAttribute('uncentered');
            node.removeAttribute('off-screen');
            if (keepOnChart) {
                if (top < 0) {
                    node.setAttribute('uncentered', true);
                    if (top < node.offsetHeight / 2 * -1) {
                        node.setAttribute('off-screen', true);
                    }
                    top = 0;
                } else if (top + node.offsetHeight > this._chart.panel.height) {
                    node.setAttribute('uncentered', true);
                    if ((top + node.offsetHeight) - this._chart.panel.height > node.offsetHeight / 2) {
                        node.setAttribute('off-screen', true);
                    }
                    top = this._chart.panel.height - node.offsetHeight;
                }
            }
            if (top !== null) node.style.top = `${top}px`;
        }
    }

    get realPrice() {
        return this.relative ? (this._currentPrice + this.price) : this.price;
    }

    get price() {
        return this._price;
    }

    set price(value) {
        if (value !== this._price) {
            this._price = value;
            this._draw();
            this._emitter.emit(PriceLine.EVENT_PRICE_CHANGED, this._price);
        }
    }

    onPriceChanged(callback) {
        this._emitter.on(PriceLine.EVENT_PRICE_CHANGED, callback);
    }

    _draw() {
        if (this.visible) {
            this._positionAtPrice(this.realPrice, [this._line], 'center', null, true);
            this._priceText.textContent = this.realPrice.toFixed(this._pipSize);
        }
    }

    get top() {
        return CIQ.stripPX(this._line.style.top);
    }

    get lineColor() {
        return super.lineColor;
    }

    set lineColor(lineColor) {
        super.lineColor = lineColor;
        CIQ.unappendClassName(this._line, PriceLine.COLOR_RED);
        CIQ.unappendClassName(this._line, PriceLine.COLOR_GREEN);
        CIQ.appendClassName(this._line, this._lineColor);
    }
}

export default PriceLine;
