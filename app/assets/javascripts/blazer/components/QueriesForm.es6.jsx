class QueriesForm extends React.Component {
  constructor(props) {
    super(props)

    let query = {...props.query}
    if (!query.data_source) {
      query.data_source = props.data_sources[0].id
    }

    this.state = {
      loading: false,
      running: false,
      tables: [],
      query: query
    }
    this.updateTables(query.data_source)

    this.handleSubmit = this.handleSubmit.bind(this)
    this.handleDelete = this.handleDelete.bind(this)
    this.handleFork = this.handleFork.bind(this)
    this.cancelStatement = this.cancelStatement.bind(this)
    this.runStatement = this.runStatement.bind(this)
  }

  componentDidMount() {
    const { query } = this.state

    let editor = ace.edit(this._editor)
    editor.setTheme("ace/theme/twilight")
    editor.getSession().setMode("ace/mode/sql")
    editor.setOptions({
      enableBasicAutocompletion: false,
      enableSnippets: false,
      enableLiveAutocompletion: false,
      highlightActiveLine: false,
      fontSize: 12,
      minLines: 10
    })
    editor.renderer.setShowGutter(true)
    editor.renderer.setPrintMarginColumn(false)
    editor.renderer.setPadding(10)
    editor.getSession().setUseWrapMode(true)
    editor.commands.addCommand({
      name: 'run',
      bindKey: {win: 'Ctrl-Enter',  mac: 'Command-Enter'},
      exec: function(editor) {
        // $("#run").click()
      },
      readOnly: false // false if this command should not apply in readOnly mode
    })

    editor.on('change', () => {
      this.updateQuery({statement: editor.getValue()})
    })

    this.editor = editor

    if (this.queryPresent()) {
      editor.setValue(query.statement, 1)
    }
  }

  goBack(e) {
    e.preventDefault()
    window.history.back()
  }

  render() {
    const { query, loading } = this.state

    return (
      <div>
        <form onSubmit={this.handleSubmit}>
          <div className="row">
            <div className="col-xs-8">
              <div className= "form-group">
                <div id="editor-container">
                  <div id="editor" ref={(n) => this._editor = n}></div>
                </div>
              </div>
              <div className="form-group text-right">
                <div className="pull-left" style={{marginTop: "6px"}}>
                  <a href="#" onClick={this.goBack}>Back</a>
                </div>
                <div id="data-sources">
                  {this.renderDataSources()}
                </div>
                <div id="tables">
                  {this.renderTables()}
                </div>
                {this.renderRun()}
              </div>
            </div>
            <div className="col-xs-4">
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input type="text" value={query.name || ""} onChange={(e) => this.updateQuery({name: e.target.value})} className="form-control" />
              </div>
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea value={query.description || ""} onChange={(e) => this.updateQuery({description: e.target.value})} style={{height: "80px"}} placeholder="Optional" className="form-control"></textarea>
              </div>
              <div className="text-right">
                {this.renderDelete()}
                {" "}
                {this.renderFork()}
                {" "}
                <input type="submit" value={query.id ? "Update" : "Create"} className="btn btn-success" disabled={loading} />
              </div>
              {this.renderWarnings()}
            </div>
          </div>
        </form>
        <div id="results">
          {this.renderResults()}
        </div>
      </div>
    )
  }

  renderWarnings() {
    // TODO
    // <% if @query.persisted? %>
    //   <% dashboards_count = @query.dashboards.count %>
    //   <% checks_count = @query.checks.count %>
    //   <% words = [] %>
    //   <% words << pluralize(dashboards_count, "dashboard") if dashboards_count > 0 %>
    //   <% words << pluralize(checks_count, "check") if checks_count > 0 %>
    //   <% if words.any? %>
    //     <div class="alert alert-info" style="margin-top: 10px; padding: 8px 12px;">
    //       Part of <%= words.to_sentence %>. Be careful when editing.
    //     </div>
    //   <% end %>
    // <% end %>
  }

  renderDelete() {
    const { query, loading } = this.state
    if (query.id) {
      return <button type="button" onClick={this.handleDelete} className="btn btn-danger" disabled={loading}>Delete</button>
    }
  }

  renderFork() {
    const { query, loading } = this.state
    if (query.id) {
      return <button type="button" onClick={this.handleFork} className="btn btn-info" disabled={loading}>Fork</button>
    }
  }

  handleDelete(e) {
    e.preventDefault()

    if (confirm("Are you sure?")) {
      this.setState({loading: true})

      const { query } = this.state

      $.ajax({
        method: "DELETE",
        url: Routes.blazer_query_path(query.id),
        dataType: "json"
      }).done((data) => {
        window.location.href = Routes.blazer_root_path()
      })
    }
  }

  handleFork(e) {
    this.handleSubmit(e, true)
  }

  updateQuery(attributes) {
    this.setState({
      query: {
        ...this.state.query,
        ...attributes
      }
    })
  }

  handleSubmit(e, fork) {
    e.preventDefault()

    this.setState({loading: true})
    let {id, ...data} = this.state.query;

    if (fork) {
      id = null
    }

    let method, url
    if (id) {
      method = "PUT"
      url = Routes.blazer_query_path(id)
    } else {
      method = "POST"
      url = Routes.blazer_queries_path()
    }

    var jqxhr = $.ajax({
      method: method,
      url: url,
      data: {query: data},
      dataType: "json"
    }).done((data) => {
      window.location.href = Routes.blazer_query_path(data, this.props.variable_params)
    }).fail((xhr) => {
      let json
      try {
        json =  $.parseJSON(xhr.responseText)
      } catch (err) {
        json = {errors: [xhr.statusText]}
      }
      this.setState({errors: json.errors, loading: false})
    })
  }

  updateTables(data_source) {
    $.getJSON(Routes.blazer_tables_queries_path({data_source: data_source}), (data) => {
      this.setState({tables: data})
    })
  }

  renderDataSources() {
    const { data_sources } = this.props
    const { query } = this.state

    if (data_sources.length > 1) {
      return <Select
        value={query.data_source}
        options={data_sources.map((ds) => {
          return {
            label: ds.name,
            value: ds.id
          }
        })}
        onChange={(val) => {
          this.updateQuery({data_source: val.value})
          this.updateTables(val.value)
        }}
        clearable={false}
        searchable={false}
        backspaceRemoves={false}
        autoBlur={true}
      />
    }
  }

  renderTables() {
    const { tables } = this.state

    return <Select
            value={null}
            placeholder="Preview table"
            options={tables.map((v) => {
              return {label: v, value: v}
            })}
            onChange={(val) => this.previewTable(val.value)}
            clearable={false}
            autoBlur={true}
          />
  }

  previewTable(table) {
    const { query } = this.state
    let statement = this.props.preview_statement[query.data_source].replace("{table}", table)
    this.updateQuery({statement: statement})
    this.editor.setValue(statement, 1)
    this.runStatement()
  }

  renderResults() {
    if (this.state.running) {
      return <p className="text-muted">Loading...</p>
    } else if (this.state.results) {
      return <QueriesResult stickyHeaders={false} {...this.state.results} />
    }
  }

  renderRun() {
    if (this.state.running) {
      return <button type="button" onClick={this.cancelStatement} className="btn btn-danger" style={{verticalAlign: "top", width: "72px"}}>Cancel</button>
    } else {
      return <button type="button" onClick={this.runStatement} disabled={!this.queryPresent() || this.state.loading} className="btn btn-info" style={{verticalAlign: "top", width: "72px"}}>Run</button>
    }
  }

  runStatement(e) {
    if (e) {
      e.preventDefault()
    }

    const { query } = this.state

    var data = $.extend({}, this.props.variable_params, {statement: this.editor.getValue(), data_source: query.data_source})

    this.setState({running: true, results: null})

    this.xhr = runQuery(data, (data) => {
      this.setState({results: data, running: false})
    }, (error) => {
      console.log(error)
    })
  }

  cancelStatement(e) {
    e.preventDefault()

    this.xhr.abort()
    this.setState({running: false})
  }

  queryPresent() {
    return (this.state.query.statement || "").trim().length > 0
  }
}
