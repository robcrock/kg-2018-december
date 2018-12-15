////////////////////////////////////////////////////////////////////////////////
// CREATE A CHART CLASS
////////////////////////////////////////////////////////////////////////////////
class Chart {
  constructor(opts) {
    this.element = opts.element;
    this.width = opts.width;
    this.height = opts.height;
    this.margin = opts.margin;
    this.padding = opts.padding;
    this.data = opts.data;

    this.cleanData(this.data);
    this.marginConvention();
    this.scales();
    this.axes();
  }
  cleanData(data) {
    this.cleanData = data.map(d => {
      return {
        country: d.country,
        year: +d.year,
        le: +d['life-expectancy']
      };
    })

    return this.cleanData;
  }
  marginConvention() {
    console.log(this.margin);
    this.plotWidth = this.width - this.margin.right;
    this.plotHeight = this.height - this.margin.bottom;
    this.chartWidth = this.plotWidth - this.padding.right;
    this.chartHeight = this.plotHeight - this.padding.bottom;

    // This SVG is the full size of the container. All charts will fit inside this space
    const svg = d3.select(this.element).append('svg')
      .attr('width', this.width)
      .attr('height', this.height);

    this.plot = svg.append('g')
      .classed('plot', true)
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`)
      .attr('width', this.plotWidth)
      .attr('height', this.plotHeight);
  }
  scales() {
    this.xScale = d3.scaleLinear()
      .domain(d3.extent(this.data, d => +d.year))
      .range([
        this.margin.left + this.padding.left,
        this.plotWidth - (this.margin.right + this.padding.right)
      ]);

    this.yScale = d3.scaleLinear()
      .domain([-50, 50])
      .range([
        this.chartHeight,
        this.margin.top + this.padding.top
      ]);

    this.startingPosition = this.xScale.domain()[0];
  }
  axes() {
    this.xAxis = d3.axisBottom()
      .scale(this.xScale);

    this.yAxis = d3.axisRight()
      .scale(this.yScale);
  }
}
////////////////////////////////////////////////////////////////////////////////
// EXTEND CHART CLASS TO CREATE A SLIDER CLASS
////////////////////////////////////////////////////////////////////////////////
class Slider extends Chart{
  constructor(opts) {
    super({
      element: opts.element,
      width: opts.width,
      height: opts.height,
      margin: opts.margin,
      padding: opts.padding,
      data: opts.data
    })

    // this.createScales();
    this.createSlider();
  }

  createSlider() {
    // Ensure that the handle doesn't slide off the track
    this.xScale.clamp(true);

    // All our elements will hang off this slider
    const slider = this.plot.append("g")
        .attr("transform", `translate( ${this.margin.left}, ${this.chartHeight * .8})`);

    slider.append("line")
        .attr("class", "track")
        .attr("x1", this.xScale.range()[0])
        .attr("x2", this.xScale.range()[1])
      .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
        .attr("class", "track-inset")
      .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
        .attr("class", "track-overlay")
      .call(d3.drag()
        .on("drag", () => this.dragging(this.xScale.invert(d3.event.x))));

    this.handle = slider.insert("circle", ".track-overlay")
      .attr("class", "handle")
      .attr('cx', this.xScale(this.startingPosition))
      .attr("r", 9);

    this.label = slider.append("text")  
      .attr("class", "label")
      .attr("text-anchor", "middle")
      .text(this.startingPosition)
      .attr('font-size', 16)
      .attr('font-weight', 400)
      .attr("transform", `translate(${this.xScale(this.startingPosition)}, -20)`)
      .attr('font-family', 'PT Mono')
  }
}

////////////////////////////////////////////////////////////////////////////////
// EXTEND CHART CLASS TO CREATE CREATE A LINE CHART CLASS
////////////////////////////////////////////////////////////////////////////////
class LineChart extends Chart{
  constructor(opts) {
    super({
      element: opts.element,
      width: opts.width,
      height: opts.height,
      margin: opts.margin,
      padding: opts.padding,
      data: opts.data
    })

    this.transformData(this.cleanData);
    this.gridlines();
    this.createLine();
    this.floatingAxis();
  }
  transformData(data) {
    const baselineYear = data.filter(d => d.year === this.startingPosition);

    this.transformedData = d3.nest()
      .key(d => d.country)
      .entries(data);

    // console.log("Trans data ", this.transformedData)

    for (const country of this.transformedData) {
      const baselineCountry = baselineYear.filter(d => d.country === country.key);
      // console.log('bl country ', baselineCountry)
      for (const value of country.values) {
        // console.log('val ', value)
        // debugger;
        value.diff = value.le - baselineCountry[0].le;
      }
    }

    // console.log('Trans d ',this.transformedData);
    return this.transformedData;
  }
  gridlines() {
    const gridArray = [
      {value: 50},
      {value: 40},
      {value: 30},
      {value: 20},
      {value: 10},
      {value: 0},
      {value: -10},
      {value: -20},
      {value: -30},
      {value: -40},
      {value: -50}
    ];

    this.plot.selectAll('.grid-line').data(gridArray).enter().append('line')
        .attr('x1', this.margin.left + this.padding.left)
        .attr('x2', this.chartWidth)
        .attr('y1', d => this.yScale(d.value))
        .attr('y2', d => this.yScale(d.value))
        .attr('stroke', d => d.value === 0 ? '#BABABA' : '#EDEDED')
        .attr('stroke-width', d => d.value === 0 ? 2 : 1);

  }
  createLine() {
    this.lineGenerator = d3.line()
      .x(d => this.xScale(d.year))
      .y(d => this.yScale(d.diff))
      .curve(d3.curveCardinal);

    this.line = this.plot.selectAll('path').data(this.transformedData, d => d.key);

    this.lineEnter = this.line.enter().append('path')
      .attr('fill', 'none')
      .attr('stroke', 'steelblue')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.2)
      .attr('d', d => this.lineGenerator(d.values));
  }
  floatingAxis() {
    this.yRefLine = this.plot.append('g')
      .classed('y-axis', true)
      .attr('transform', `translate(${this.xScale(this.startingPosition)}, 0)`)
        .call(this.yAxis)
          .attr('font-family', 'PT Mono')
          .attr('font-size', 14);

    d3.select('.y-axis').selectAll('g').nodes()[5].remove();

    this.yRefLine.selectAll('line').remove();

    this.yRefLine.select('path')
      .attr('stroke', '#BABABA')
      .attr('opacity', 0.5);

    this.yRefLine.selectAll('text')
      .attr('font-weight', 200)
      .attr('text-anchor', 'middle')
      .attr('x', 0);
  }
}

////////////////////////////////////////////////////////////////////////////////
// LOAD DATA FOR THE 1ST TIME
////////////////////////////////////////////////////////////////////////////////
d3.csv('/data/life-expectancy.csv').then((data) => {
  const width = 960;
  const height = 500;

  const slider = new Slider ({
    element: document.querySelector('.slider'),
    width,
    height: 50,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    padding: { top: 0, right: 30, bottom: 5, left: 30 },
    data,
  });

  const lineChart = new LineChart({
    element: document.querySelector('.lineChart'),
    width,
    height,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    padding: { top: 10, right: 30, bottom: 30, left: 30 },
    data,
  });

  ////////////////////////////////////////////////////////////////////////////////
  // CREATE CONTROLERS
  ////////////////////////////////////////////////////////////////////////////////
  slider.dragging = function(h) {

    this.handle
      .attr('cx', this.xScale(h));

    this.label
      .attr('transform', `translate(${this.xScale(h)}, -20)`)
      .text(Math.round(h));

    lineChart.yRefLine
      .attr('transform', `translate(${this.xScale(h)}, 0)`);

    const baselineYear = lineChart.cleanData.filter(d => d.year === Math.round(h));

    for (const country of lineChart.transformedData) {
      const baselineCountry = baselineYear.filter(d => d.country === country.key);
      for (const value of country.values) {
        value.diff = value.le - baselineCountry[0].le;
      }
    }
  
    lineChart.lineEnter
      .merge(lineChart.line.data(lineChart.transformedData, d => d.key))
      .attr('d', d => lineChart.lineGenerator(d.values));
  }
});