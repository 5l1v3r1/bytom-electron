import React from 'react'
import { connect } from 'react-redux'
import actions from 'actions'
import { Main, Config, Login, Loading, Register ,Modal } from './'
import moment from 'moment'
import { withI18n } from 'react-i18next'

const CORE_POLLING_TIME = 2 * 1000

class Container extends React.Component {
  constructor(props) {
    super(props)
    if(props.location.pathname.includes('index.html')) {
      this.redirectRoot(props)
    }
    this.state = {
      noAccountItem: false
    }
    this.redirectRoot = this.redirectRoot.bind(this)
  }

  redirectRoot(props) {
    const {
      authOk,
      configured,
      location
    } = props

    if (!authOk) {
      return
    }

    if (configured) {
      if (location.pathname === '/' ||
          location.pathname.indexOf('configuration') >= 0 || location.pathname.includes('index.html')) {
        this.props.showRoot()
      }
    } else {
      this.props.showConfiguration()
    }
  }
  componentDidMount() {
    if(window.ipcRenderer){
      window.ipcRenderer.on('redirect', (event, arg) => {
        this.props.history.push(arg)
      })
      window.ipcRenderer.on('btmAmountUnitState', (event, arg) => {
        this.props.uptdateBtmAmountUnit(arg)
      })
      window.ipcRenderer.on('ConfiguredNetwork', (event, arg) => {
        if(arg === 'startNode'){
          this.props.fetchInfo().then(() => {
            this.props.fetchAccountItem().then(resp => {
              if (resp.data.length == 0) {
                this.setState({noAccountItem: true})
              }
            })
            this.props.showRoot()
          })
          setInterval(() => this.props.fetchInfo(), CORE_POLLING_TIME)
        }
        if(arg === 'init'){
          this.props.updateConfiguredStatus()
        }
      })
      window.ipcRenderer.on('mining', (event, arg) => {
        let isMining = (arg == 'true')
        this.props.updateMiningState(isMining)
      })
    }
    if(this.props.lng === 'zh'){
      moment.locale('zh-cn')
    }else{
      moment.locale(this.props.lng)
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.authOk != this.props.authOk ||
        nextProps.configKnown != this.props.configKnown ||
        nextProps.configured != this.props.configured ||
        nextProps.location.pathname != this.props.location.pathname) {
      this.redirectRoot(nextProps)
    }
  }

  render() {
    let layout
    const { t, i18n } = this.props
    i18n.on('languageChanged', function(lng) {
      if(lng === 'zh'){
        moment.locale('zh-cn')
      }else{
        moment.locale(lng)
      }
    })

    if (!this.props.authOk) {
      layout = <Login/>
    } else if (!this.props.configured) {
      layout = <Config>{this.props.children}</Config>
    } else if (!this.props.configKnown) {
      return <Loading>{t('welcome.connect')}</Loading>
    } else if (!this.props.accountInit && this.state.noAccountItem){
      layout = <Register>{this.props.children}</Register>
    } else{
      layout = <Main>{this.props.children}</Main>
    }

    return <div>
      {layout}
      <Modal />

      {/* For copyToClipboard(). TODO: move this some place cleaner. */}
      <input
        id='_copyInput'
        onChange={() => 'do nothing'}
        value='dummy'
        style={{display: 'none'}}
      />
    </div>
  }
}

export default connect(
  (state) => ({
    authOk: !state.core.requireClientToken || state.core.validToken,
    configKnown: state.core.configKnown,
    configured: state.core.configured,
    onTestnet: state.core.onTestnet,
    flashMessages: state.app.flashMessages,
    accountInit: state.core.accountInit,
  }),
  (dispatch) => ({
    fetchInfo: options => dispatch(actions.core.fetchCoreInfo(options)),
    updateMiningState: param => dispatch(actions.core.updateMiningState(param)),
    showRoot: () => dispatch(actions.app.showRoot),
    showConfiguration: () => dispatch(actions.app.showConfiguration()),
    uptdateBtmAmountUnit: (param) => dispatch(actions.core.updateBTMAmountUnit(param)),
    updateConfiguredStatus: () => dispatch(actions.core.updateConfiguredStatus),
    markFlashDisplayed: (key) => dispatch(actions.app.displayedFlash(key)),
    fetchAccountItem: () => dispatch(actions.account.fetchItems())
  })
)( withI18n() (Container) )
