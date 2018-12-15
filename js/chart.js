////////////////////////////////////////////////////////////////////////////////
// CREATE A SLIDER CLASS
////////////////////////////////////////////////////////////////////////////////
class Slider {
  constructor(opts) {
    this.element = opts.element;
    this.width = opts.width;
    this.height = opts.height;
    this.margin = opts.margin;
    this.padding = opts.padding;
    this.data = opts.data;

    this.setupChartArea();
    this.createScales();
    this.createSlider();
  }

  setupChartArea() {
    // Create additional setup variables we'll need locally based on the options above
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

  createScales() {
    this.xScale = d3.scaleLinear()
      .domain(d3.extent(this.data, d => +d.year))
      .range([
        this.margin.left + this.padding.left,
        this.plotWidth - (this.margin.right + this.padding.right)
      ])
      .clamp(true);
  }

  createSlider() {
    this.startingPosition = this.xScale.domain()[0];

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
// CREATE A LINE CHART CLASS
////////////////////////////////////////////////////////////////////////////////
class LineChart {
  constructor(opts) {
    this.element = opts.element;
    this.width = opts.width;
    this.height = opts.height;
    this.margin = opts.margin;
    this.padding = opts.padding;
    this.data = opts.data;

    this.updateData(this.data);
    this.setupChartArea();
    this.createScales();
    this.createAxes();
    this.addDecorations();
    this.createLine();
    this.addRefLines();
  }

  updateData(data) {
    const firstYear = d3.min(data, d => d.year);
    const baselineYear = data.filter(d => d.year === firstYear);

    for (const row of data) {
      row.year = +row.year;
      row.le = +row['life-expectancy'];
      delete row['life-expectancy'];
    }

    this.transformedData = d3.nest()
      .key(d => d.country)
      .entries(data);

    for (const country of this.transformedData) {
      const baselineCountry = baselineYear.filter(d => d.country === country.key);
      for (const value of country.values) {
        value.diff = value.le - baselineCountry[0].le;
      }
    }

    return this.transformedData;
  }

  setupChartArea() {
    // Create additional setup variables we'll need locally based on the options above
    this.plotWidth = this.width - this.margin.right;
    this.plotHeight = this.height - this.margin.bottom;
    this.chartWidth = this.plotWidth - this.padding.right;
    this.chartHeight = this.plotHeight - this.padding.bottom;

    // // This SVG is the full size of the container. All charts will fit inside this space
    const svg = d3.select(this.element).append('svg')
      .attr('width', this.width)
      .attr('height', this.height);

    this.plot = svg.append('g')
      .classed('plot', true)
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`)
      .attr('width', this.plotWidth)
      .attr('height', this.plotHeight);
  }

  createScales() {
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
  }

  createAxes() {
    this.xAxis = d3.axisBottom()
      .scale(this.xScale);

    this.yAxis = d3.axisRight()
      .scale(this.yScale);
  }
  
  addDecorations() {
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

  addRefLines() {
    const startingPosition = this.xScale.domain()[0];
    
    this.yRefLine = this.plot.append('g')
      .classed('y-axis', true)
      .attr('transform', `translate(${this.xScale(startingPosition)}, 0)`)
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

    const baselineYear = lineChart.data.filter(d => d.year === Math.round(h));

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