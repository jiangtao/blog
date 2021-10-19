// 代码为伪代码, 具体请在自己的项目中实践
export default {
  components: {
      InputCode,
      Expr,
      colorPicker: color,
  },
  props: {
  },
  methods: {
      // render函数在不同的组件里面可以重写掉
      render(h) {
          return (
              <a-form layout="horizontal" class="style-layout suda-props">
                  {
                      this.propsList.map((prop, index) => this.renderFormItem(h, prop))
                  }
              </a-form>
          );
      },
      renderFormItem(h, prop, isExpr = true) {
          // 添加一个类型需要实现一个 render,避免 if else ugly 的写法
          // 规则, 比如 string-or-json, 对应的 render 方法是 renderStringOrJson
          const execFunc = `render${camelCase(prop.type)}`;
          return (
              <a-form-item key={prop.key}>
                  {
                      <div class="prop-label" slot="label">
                              <div class="title">{prop.name}</div>
                      </div>
                  }
                  { /* 不同的类型 采用不同的渲染策略 */}
                  {typeof this[execFunc] === 'function' && this[execFunc](h, prop, isExpr)}
              </a-form-item>
          );
      },
      renderNumberUnit(h, prop) {
          return (
              <a-input type={'number'} style={{ width: '165px' }} size={'small'}  default-value={pureValue} value={pureValue} />
          );
      },
      renderOptions(h, prop) {
          return (
                  <a-select />
          );
      },
      renderBoolean(h, prop) {
          // a-switch not support v-model, use mtd-switch
          return (
                  <a-switch />
          );
      },
      renderString(h, prop, isExpr = true) {
          const _renderInput = (h, prop) => (
              <a-input
                  onBlur={(e) => this.setValue(e, prop)}
                  onInput={(e) => this.setValue(e, prop)}
                  size="small"
                  value={this.getInputValue(prop)}
              />
          );
          return _renderInput(h, prop)
      }
  }
}