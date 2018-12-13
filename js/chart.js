////////////////////////////////////////////////////////////////////////////////
/////////////////////////// CREATE A LINE CHART CLASS //////////////////////////
////////////////////////////////////////////////////////////////////////////////
class LineChart {
  constructor(opts) {
    this.element = opts.element;
    this.width = opts.width;
    this.height = opts.height;
    this.margin = opts.margin;
    this.padding = opts.padding;
    this.data = opts.data;

    // Create additional setup variables we'll need locally based on the options above
    this.plotWidth = this.width - (this.margin.left + this.margin.right);
    this.plotHeight = this.height - (this.margin.top + this.margin.bottom);
    this.chartWidth = this.plotWidth - (this.padding.right + this.padding.left);
    this.chartHeight = this.plotHeight - (this.padding.top + this.padding.bottom);

    this.updateData(this.data);
    this.setupChartArea();
    this.createScales();
    this.createSlider();
    this.createLine();
    this.createAxes();
  }

  updateData(data) {
    const baselineYear = data.filter(d => d.year === '1981');

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
    const svg = d3.select(this.element).append('svg')
      .attr('width', this.width)
      .attr('height', this.height);

    this.plot = svg.append('g')
      .classed('plot', true)
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`)
      .attr('width', this.width - (this.margin.left + this.margin.right))
      .attr('height', this.height - (this.margin.top + this.margin.bottom));
  }

  createScales() {
    this.xScale = d3.scaleLinear()
      .domain(d3.extent(this.data, d => +d.year))
      .range([this.padding.left, this.width - this.padding.right]);

    this.yScale = d3.scaleLinear()
      .domain([-50, 50])
      .range([this.height - this.padding.bottom, this.padding.top]);

    ////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////// CREATE LINE GENERATOR ////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////
    this.lineGenerator = d3.line()
      .x(d => this.xScale(d.year))
      .y(d => this.yScale(d.diff))
      .curve(d3.curveCardinal);
  }

  createAxes() {
    this.xAxis = d3.axisBottom()
      .scale(this.xScale);

    this.yAxis = d3.axisRight()
      .scale(this.yScale);

    this.yRefLine = this.plot.append('g')
      .classed('y-axis', true)
      .attr('transform', `translate(${this.xScale(1981)}, ${this.padding.top})`)
      .call(this.yAxis);

    this.yRefLine.selectAll('text')
      .attr('text-anchor', 'middle')
      .attr('x', 0);

    this.xRefLine = this.plot.append('g')
      .classed('x-axis', true)
      .call(this.xAxis
        .tickFormat(d3.format('0')))
      .attr('font-size', 12)
      .attr('transform', `translate(0, ${this.yScale(0)})`);
  }

  createSlider() {
    
    const startDate = 1961;
    ////////// slider //////////
    const svgSlider = d3.select(".slider")
        .append("svg")
        .attr("width", this.width + this.margin.left + this.margin.right)
        .attr("height", this.height);
        
    this.x = d3.scaleLinear()
        .domain([this.xScale.domain()[0], this.xScale.domain()[1]])
        .range([0, this.width])
        .clamp(true);

    const slider = svgSlider.append("g")
        .attr("class", "slider")
        .attr("transform", "translate(" + this.margin.left + "," + this.height / 2 + ")");

    slider.append("line")
        .attr("class", "track")
        .attr("x1", this.x.range()[0])
        .attr("x2", this.x.range()[1])
    .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
        .attr("class", "track-inset")
    .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
        .attr("class", "track-overlay")
        .call(d3.drag()
            .on("start.interrupt", function() { slider.interrupt(); })
            .on("start drag", () =>  { this.update(this.x.invert(d3.event.x)) }));
    slider.insert("g", ".track-overlay")
        .attr("class", "ticks")
        .attr("transform", "translate(0," + 18 + ")")
    .selectAll("text")
        .data(this.x.ticks(10))
        .enter()
        .append("text")
        .attr("x", this.x)
        .attr("y", 10)
        .attr("text-anchor", "middle")
        .text(function(d) { return d; });

    this.handle = slider.insert("circle", ".track-overlay")
        .attr("class", "handle")
        .attr('cx', this.x(1981))
        .attr("r", 9);

    this.label = slider.append("text")  
        .attr("class", "label")
        .attr("text-anchor", "middle")
        .text(startDate)
        .attr("transform", `translate(${this.x(1981)}, -25)`)

  }

  update(h) {
    // update position and text of label according to slider scale
    this.handle
      .attr('cx', this.x(h));

    this.label
      .attr('transform', `translate(${this.x(h)}, -25)`)
      .text(Math.round(h));

    this.yRefLine
      .attr('transform', `translate(${this.xScale(h)}, ${this.padding.top})`);

    const baselineYear = this.data.filter(d => d.year === Math.round(h));

    for (const country of this.transformedData) {
      const baselineCountry = baselineYear.filter(d => d.country === country.key);
      for (const value of country.values) {
        value.diff = value.le - baselineCountry[0].le;
      }
    }

    this.lineEnter
      .merge(this.line.data(this.transformedData, d => d.key))
      .attr('d', d => this.lineGenerator(d.values));
  }

  createLine() {
    this.line = d3.select('.plot')
      .selectAll('path').data(this.transformedData, d => d.key);

    this.lineEnter = this.line.enter()
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', 'steelblue')
      .attr('stroke-width', 1.5)
      .attr('opacity', 0.2)
      .attr('d', d => this.lineGenerator(d.values));
  }
}

////////////////////////////////////////////////////////////////////////////////
////////////////////////// LOAD DATA FOR THE 1ST TIME //////////////////////////
////////////////////////////////////////////////////////////////////////////////
d3.csv('/data/life-expectancy.csv').then((data) => {
  ////////////////////////////////////////////////////////////////////////////////
  ////////////////////////////// SET THE CHART SIZE //////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////
  const width = 960;
  const height = 500;
  const margin = {
    top: 10, right: 10, bottom: 10, left: 10,
  };
  const padding = {
    top: 0, right: 40, bottom: 30, left: 30,
  };

  ////////////////////////////////////////////////////////////////////////////////
  /////////////////////////////// CREATE NEW CHART ///////////////////////////////
  ////////////////////////////////////////////////////////////////////////////////
  const chart = new LineChart({
    element: document.querySelector('.chart'),
    width,
    height,
    margin,
    padding,
    data,
  });
});
