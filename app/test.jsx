import { configure } from 'mobx';
import { // eslint-disable-line import/no-extraneous-dependencies
    SmartChart,
    // TradeStartLine,
    // TradeEndLine,
    ChartTypes,
    StudyLegend,
    Comparison,
    Views,
    CrosshairToggle,
    setSmartChartsPublicPath,
    Timeperiod,
    ChartSize,
    DrawTools,
    ChartSetting,
    Share,
    Marker,
} from '@binary-com/smartcharts'; // eslint-disable-line import/no-unresolved
import React from 'react';
import ReactDOM from 'react-dom';
import moment from 'moment';
import './test.scss';
import { ConnectionManager, StreamManager } from './connection';

setSmartChartsPublicPath('./dist/');

configure({ enforceActions: 'observed' });

const isMobile = window.navigator.userAgent.toLowerCase().includes('mobi');

const getLanguageStorage = function () {
    const default_language = 'en';
    try {
        const setting_string = localStorage.getItem('smartchart-setting'),
            setting = JSON.parse(setting_string !== '' ? setting_string : '{}');

        return setting.language || default_language;
    } catch (e) {
        return default_language;
    }
};

const connectionManager = new ConnectionManager({
    appId: 12812,
    language: getLanguageStorage(),
    endpoint: 'wss://ws.binaryws.com/websockets/v3',
});

const streamManager = new StreamManager(connectionManager);


const requestAPI = connectionManager.send.bind(connectionManager);
const requestSubscribe = streamManager.subscribe.bind(streamManager);
const requestForget = streamManager.forget.bind(streamManager);

class App extends React.Component {
    state = {
        highLow: {},
        draggable: true,
        granularity: 120,
    };

    onPriceLineDisableChange = (evt) => {
        this.setState({ hidePriceLines: evt.target.checked });
    };

    onColorChange =(evt) => {
        this.setState({ shadeColor: evt.target.value });
    }

    onHighLowChange = (evt) => {
        this.setState({ highLow: { [evt.target.id]: +evt.target.value } });
    };

    onRelativeChange = (evt) => {
        this.setState({ relative: evt.target.checked });
    };

    onDraggableChange = (evt) => {
        this.setState({ draggable: evt.target.checked });
    };

    handleBarrierChange = (evt) => {
        this.setState({ highLow: evt });
    };

    handleBarrierTypeChange = (evt) => {
        const { value: barrierType } = evt.target;
        const nextState = (barrierType === '') ? { highLow : {} } : {};
        this.setState({ ...nextState, barrierType });
    };

    renderControls = () => (
        <>
            {isMobile ? '' : <CrosshairToggle />}
            <ChartTypes />
            <StudyLegend />
            <Comparison />
            <DrawTools />
            <Views />
            <Share />
            <Timeperiod
                onChange={(timePeriod) => {
                    this.setState({
                        granularity: timePeriod,
                    });
                }}
            />
            {isMobile ? '' : <ChartSize />}
            <ChartSetting />
        </>
    );

    toggleStartEpoch = () => {
        if (this.state.scrollToEpoch) {
            this.setState({
                scrollToEpoch: undefined,
            });
        } else {
            this.setState({
                scrollToEpoch: moment.utc().unix(),
            });
        }
    };

    onLeftOffset = (evt) => {
        this.setState({
            leftOffset: +evt.target.value,
        });
    };

    render() {
        const { barrierType, highLow : { high, low }, hidePriceLines, draggable, relative, shadeColor, scrollToEpoch, leftOffset } = this.state;
        const barriers = barrierType ? [{
            shade: barrierType,
            shadeColor,
            color: '#f44336',
            onChange: this.handleBarrierChange,
            relative,
            draggable,
            lineStyle: 'dotted',
            hidePriceLines,
            high,
            low,
        }] : [];

        const MarkerTimes = [];

        for (let i = 0; i < 5; i++) {
            MarkerTimes.push(moment().utc().second(0).subtract(i + 3, 'minutes')
                .unix());
        }

        return (
            <div className="grid" style={{ diplay: 'block' }}>
                <div className="chart-instance">
                    <SmartChart
                        onSymbolChange={symbol => console.log('Symbol has changed to:', symbol)}
                        isMobile={isMobile}
                        chartControlsWidgets={this.renderControls}
                        requestAPI={requestAPI}
                        requestSubscribe={requestSubscribe}
                        requestForget={requestForget}
                        barriers={barriers}
                        granularity={this.state.granularity}
                        scrollToEpoch={scrollToEpoch}
                        scrollToEpochOffset={leftOffset}
                    >
                        {MarkerTimes.map(x => (
                            <Marker
                                key={x}
                                className="chart-marker-line"
                                x={x}
                                xPositioner="epoch"
                                yPositioner="top"
                            />
                        ))}
                    </SmartChart>
                </div>
                <div className="bottom-blob">
                    <label htmlFor="barrierType">
                        Choose barrier type:&nbsp;
                        <select defaultValue="" id="barrierType" onChange={this.handleBarrierTypeChange}>
                            <option value="NONE_SINGLE">NONE_SINGLE</option>
                            <option value="NONE_DOUBLE">NONE_DOUBLE</option>
                            <option value="ABOVE">ABOVE</option>
                            <option value="BELOW">BELOW</option>
                            <option value="BETWEEN">BETWEEN</option>
                            <option value="OUTSIDE">OUTSIDE</option>
                            <option value="">disable</option>
                        </select>
                        Choose barrier bg color:&nbsp;
                        <select defaultValue="" id="barrierBGColor" onChange={this.onColorChange}>
                            <option value="GREEN">GREEN</option>
                            <option value="RED">RED</option>
                            <option value="YELLOW">YELLOW</option>
                            <option value="ORANGERED">ORANGERED</option>
                            <option value="PURPLE">PURPLE</option>
                            <option value="BLUE">BLUE</option>
                            <option value="DEEPPINK">DEEPPINK</option>
                        </select>
                        &nbsp;
                        <b>low:</b> <input id="low" type="number" value={low === undefined ? '' : low} onChange={this.onHighLowChange} />,
                        <b>high:</b> <input id="high" type="number" value={high === undefined ? '' : high} onChange={this.onHighLowChange} />;
                        No PriceLine: <input type="checkbox" checked={hidePriceLines === undefined ? '' : hidePriceLines} onChange={this.onPriceLineDisableChange} />
                        Relative: <input type="checkbox" checked={relative === undefined ? '' : relative} onChange={this.onRelativeChange} />
                        Draggable: <input type="checkbox" checked={draggable === undefined ? '' : draggable} onChange={this.onDraggableChange} />
                        <div>
                            Toggle StartEpoch: <button type="button" onClick={this.toggleStartEpoch}>Toggle</button>
                            LeftOffset(bars): <input type="number" value={leftOffset || 0} onChange={this.onLeftOffset} />
                        </div>
                    </label>
                </div>
            </div>
        );
    }
}

ReactDOM.render(
    <App />,
    document.getElementById('root'),
);
