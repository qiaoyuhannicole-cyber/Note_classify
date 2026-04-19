// 智能分类函数 - 基于语义理解进行分类
export function generateSmartTag(text: string): string | null {
  console.log('=== 分类函数调试 ===')
  console.log('原始输入:', text)

  const cleanText = text.toLowerCase().trim()
  console.log('清理后的文本:', cleanText)

  if (!cleanText) {
    console.log('清理后的文本为空，返回null')
    return null
  }

  // 提取问题的核心主题词
  const extractTopic = (question: string): string | null => {
    // 移除常见的疑问词和助词
    const questionWords = ['什么是', '如何', '怎么', '为什么', '哪些', '哪个', '怎样', '如何做', '怎么用', '怎么才能', '什么是', '什么叫', '什么叫做', '解释', '定义', '描述', '介绍', '说明']
    let topic = question
    for (const word of questionWords) {
      topic = topic.replace(word, '')
    }

    // 移除标点符号
    topic = topic.replace(/[？?！!。.，,、；;：:""''「」『』【】]/g, '').trim()

    console.log('提取的主题词:', topic)

    // 如果提取的主题太短，返回null
    if (topic.length < 2) return null

    return topic
  }

  const topic = extractTopic(cleanText)
  if (!topic) {
    console.log('主题词提取失败，返回null')
    return null
  }

  console.log('开始语义匹配...')

  // 基于主题词的语义特征进行分类
  const semanticPatterns: Record<string, (topic: string) => boolean> = {
    '自然科学': (t) => {
      const patterns = [
        /数学|代数|几何|微积分|概率|统计|函数|方程|数列|矩阵|积分|导数|极限/,
        /物理|力学|热学|光学|电学|磁学|量子|相对论|牛顿|爱因斯坦|重力|速度|加速度/,
        /化学|元素|分子|原子|反应|有机|无机|溶液|酸碱|氧化|还原|催化剂|化合物/,
        /生物|细胞|基因|遗传|进化|生态|植物|动物|微生物|DNA|RNA|蛋白质|酶/,
        /天文|宇宙|星球|恒星|行星|银河|黑洞|星系|太阳系|月球|火星|木星|土星/,
        /地理|气候|地形|海洋|大陆|河流|山脉|经纬度|地图|地震|火山|板块|大气层/
      ]
      const matched = patterns.some(pattern => pattern.test(t))
      console.log('自然科学匹配结果:', matched)
      return matched
    },
    '工程技术': (t) => {
      const patterns = [
        /计算机|编程|软件|程序|算法|数据结构|数据库|API|框架|人工智能|AI|机器学习|深度学习|神经网络/,
        /Python|Java|JavaScript|C\+\+|TypeScript|Go|Rust|Swift|Kotlin|Ruby|PHP/,
        /电子|电路|芯片|半导体|集成电路|电压|电流|电阻|电容|电感|二极管|三极管|晶体管/,
        /机械|工程|结构|材料|制造|设计|轴承|齿轮|发动机|涡轮|传动|液压|气动/,
        /环境|污染|环保|废物|废水|废气|治理|可持续发展|绿色能源|太阳能|风能/
      ]
      const matched = patterns.some(pattern => pattern.test(t))
      console.log('工程技术匹配结果:', matched)
      return matched
    },
    '医学健康': (t) => {
      const patterns = [
        /医学|解剖|生理|病理|药理|免疫|病毒|细菌|真菌|寄生虫/,
        /临床|诊断|治疗|手术|药物|症状|疾病|内科|外科|儿科|妇科/,
        /公共卫生|流行病|传染病|预防|疫苗|健康|营养|食品安全/,
        /药学|药物|药理|制药|药剂|抗生素|维生素|激素/
      ]
      const matched = patterns.some(pattern => pattern.test(t))
      console.log('医学健康匹配结果:', matched)
      return matched
    },
    '人文社科': (t) => {
      const patterns = [
        /历史|朝代|战争|革命|文明|古代|近代|现代|人物|事件|考古|文物|博物馆/,
        /哲学|思想|逻辑|伦理|美学|形而上学|认识论|存在主义|唯物主义|唯心主义/,
        /文学|诗歌|小说|散文|戏剧|作家|作品|语言|文字|文学史|文学批评/,
        /语言|语法|词汇|语音|语义|语用|语言学|翻译|外语|方言/,
        /艺术|绘画|音乐|雕塑|设计|美学|创作|表现|风格|艺术史|美术|音乐理论/
      ]
      const matched = patterns.some(pattern => pattern.test(t))
      console.log('人文社科匹配结果:', matched)
      return matched
    },
    '社会科学': (t) => {
      const patterns = [
        /经济|金融|市场|贸易|货币|投资|股票|GDP|通胀|供求|宏观经济|微观经济|财政|货币政策/,
        /政治|政府|制度|法律|宪法|民主|权利|国家|政策|选举|政党|国际关系|共和国|成立|建国|革命|战争/,
        /历史|朝代|文明|古代|近代|现代|人物|事件|考古|文物|博物馆|时间|年代|时期|时代/,
        /社会|文化|人口|教育|就业|福利|阶层|群体|组织|社会结构|社会变迁/,
        /心理|认知|情绪|行为|思维|记忆|学习|人格|发展|心理健康|心理咨询/,
        /教育|教学|学习|课程|教材|教师|学生|学校|大学|教育理论/,
        /法律|法规|宪法|民法|刑法|行政法|诉讼|法院|法官|律师|司法/,
        /管理|企业|组织|领导|决策|战略|人力资源|市场营销|财务管理|运营管理/
      ]
      const matched = patterns.some(pattern => pattern.test(t))
      console.log('社会科学匹配结果:', matched)
      return matched
    }
  }

  // 按照语义模式匹配
  for (const [category, pattern] of Object.entries(semanticPatterns)) {
    if (pattern(topic)) {
      console.log('匹配成功，分类为:', category)
      return category
    }
  }

  console.log('语义匹配失败，尝试启发式分类...')

  // 如果没有匹配到语义模式，尝试基于主题词长度和特征进行启发式分类
  if (topic.length >= 3) {
    // 较长的主题词可能是专业术语，倾向于工程技术或自然科学
    if (/技术|系统|平台|框架|库|工具|软件|应用/.test(topic)) {
      console.log('启发式分类: 工程技术')
      return '工程技术'
    }
    if (/学|论|法|理|术/.test(topic)) {
      console.log('启发式分类: 自然科学')
      return '自然科学'
    }
  }

  console.log('所有匹配失败，返回null')
  return null
}
