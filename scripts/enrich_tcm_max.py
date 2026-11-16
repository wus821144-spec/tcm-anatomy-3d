import json, os

data_path = 'www/data/anatomy_tcm_data.json'
if os.path.exists(data_path):
  d = json.load(open(data_path, encoding='utf-8'))
  muscles = d.get('muscles', [])
  m_names = {m.get('name') for m in muscles}
  MORE_MUSCLES = [
    ('胸小肌 (Pectoralis Minor)', '第3-5肋骨前面', '肩胛骨喙突', '拉肩胛骨向前下方，固定肩胛骨助吸气', '胸前神经(C8-T1)', '中府/云门深层，胸廓出口综合征压迫臂丛常见卡点'),
    ('菱形肌 (Rhomboids)', 'C7-T5棘突', '肩胛骨内侧缘', '肩胛骨内收(后缩)并下回旋', '肩胛背神经(C4-C5)', '风门/肺俞/膏肓深层，伏案含胸驼背必松解肌'),
    ('肩胛提肌 (Levator Scapulae)', 'C1-C4横突后结节', '肩胛骨上角', '上提肩胛骨并使颈部同侧屈', '肩胛背神经', '肩井/曲垣深层，落枕最常见痉挛肌'),
    ('大圆肌 (Teres Major)', '肩胛骨下角背面', '肱骨小结节嵴', '肩关节内收、内旋、后伸', '肩胛下神经', '肩贞穴深层，与背阔肌协同作用'),
    ('小圆肌 (Teres Minor)', '肩胛骨外侧缘上2/3', '肱骨大结节下部', '肩关节外旋(肩袖肌群之一)', '腋神经(C5-C6)', '臑俞穴附近，四边孔上界构成肌'),
    ('喙肱肌 (Coracobrachialis)', '肩胛骨喙突', '肱骨内侧面中部', '肩关节前屈与内收', '肌皮神经(穿行其中)', '肌皮神经穿过此肌，过度肥厚易卡压'),
    ('肱肌 (Brachialis)', '肱骨前面下半部', '尺骨粗隆及冠突', '纯屈肘关节(无论前臂旋前旋后)', '肌皮神经及桡神经外侧支', '曲泽/尺泽深层主肌'),
    ('肘肌 (Anconeus)', '肱骨外上髁后面', '尺骨鹰嘴外侧面', '辅助伸肘并紧张肘关节囊', '桡神经', '天井/清冷渊附近'),
    ('旋后肌 (Supinator)', '肱骨外上髁及尺骨旋后肌嵴', '桡骨上1/3前面', '前臂旋后', '桡神经深支(骨间后神经)', '手三里深层，Frohse弓卡压桡神经深支好发处'),
    ('尺侧腕屈肌 (Flexor Carpi Ulnaris)', '肱骨内上髁及尺骨鹰嘴', '豌豆骨、钩骨及第5掌骨底', '屈腕及腕尺偏(内收)', '尺神经(经两头间肘管)', '神门/通里/阴郄/灵道定位肌腱'),
    ('桡侧腕屈肌 (Flexor Carpi Radialis)', '肱骨内上髁', '第2掌骨底', '屈腕及腕桡偏(外展)', '正中神经', '内关/大陵桡侧定位肌腱标志'),
    ('掌长肌 (Palmaris Longus)', '肱骨内上髁', '掌腱膜', '紧张掌腱膜并辅助屈腕', '正中神经', '内关/间使/郄门/大陵肌腱间取穴核心标志(约15%人群先天缺失)'),
    ('指浅屈肌 (Flexor Digitorum Superficialis)', '肱骨内上髁、尺骨冠突、桡骨前面', '第2-5指中节指骨两侧', '屈近侧指间关节及掌指关节', '正中神经', '前臂掌侧针刺深层主肌'),
    ('拇长展肌 (Abductor Pollicis Longus)', '尺桡骨后面及骨间膜', '第1掌骨底', '外展拇指及助腕外展', '骨间后神经', '阳溪穴鼻烟壶前界肌腱(桡骨茎突狭窄性腱鞘炎受累肌)'),
    ('拇短伸肌 (Extensor Pollicis Brevis)', '桡骨后面及骨间膜', '拇指近节指骨底', '伸拇指近节', '骨间后神经', '与拇长展肌共处第一伸肌腱鞘'),
    ('拇长伸肌 (Extensor Pollicis Longus)', '尺骨后面中1/3', '拇指远节指骨底', '伸拇指末节', '骨间后神经', '鼻烟壶后界，阳溪穴取穴标志'),
    ('臀大肌 (Gluteus Maximus)', '髂骨翼外面后部、骶尾骨背面', '臀肌粗隆及髂胫束', '强力伸髋及外旋髋关节', '臀下神经(L5-S2)', '环跳/秩边所在深层，坐骨神经自其深面下行'),
    ('臀小肌 (Gluteus Minimus)', '髂骨翼外面', '股骨大转子前面', '外展及内旋髋关节', '臀上神经', '常引起类似坐骨神经痛的牵涉痛(假性坐骨神经痛)'),
    ('阔筋膜张肌 (Tensor Fasciae Latae)', '髂前上棘外侧唇', '经髂胫束止于胫骨外侧髁', '紧张髂胫束、屈髋并外展', '臀上神经', '风市/居髎主肌，跑步膝(髂胫束综合征)靶肌'),
    ('长收肌 (Adductor Longus)', '耻骨上支', '股骨粗线中1/3', '内收及辅助屈髋', '闭孔神经', '阴廉/足五里深层'),
    ('大收肌 (Adductor Magnus)', '耻骨下支、坐骨支及坐骨结节', '股骨粗线及内收肌结节', '强力内收髋关节', '闭孔神经及坐骨神经', '内收肌裂孔供股动静脉穿入腘窝'),
    ('股直肌 (Rectus Femoris)', '髂前下棘', '经髌韧带止于胫骨粗隆', '伸膝及屈髋(唯一跨双关节股四头肌)', '股神经', '伏兔/阴市/梁丘所在主肌'),
    ('股内侧肌 (Vastus Medialis)', '股骨粗线内侧唇', '髌骨内缘及胫骨粗隆', '伸膝最后15°稳定髌骨防外脱位', '股神经', '血海穴正位于股内侧肌隆起处'),
    ('股外侧肌 (Vastus Lateralis)', '股骨大转子及粗线外侧唇', '髌骨外缘及胫骨粗隆', '伸膝', '股神经', '风市前缘及婴儿股外侧肌注射安全区'),
    ('半腱肌 / 半膜肌', '坐骨结节', '胫骨近端内侧', '屈膝、伸髋并内旋小腿', '坐骨神经', '阴谷穴两肌腱间定位标志'),
    ('股二头肌 (Biceps Femoris)', '长头起坐骨结节，短头起股骨粗线', '腓骨头', '屈膝、伸髋并外旋小腿', '坐骨神经', '委阳穴位于股二头肌腱内侧缘'),
    ('比目鱼肌 (Soleus)', '腓骨头、比目鱼肌线', '跟腱止于跟骨结节', '跖屈踝关节(慢肌纤维为主，抗重力)', '胫神经', '承山/飞扬深层，小腿肌肉泵促进下肢静脉回流'),
    ('胫骨后肌 (Tibialis Posterior)', '胫腓骨后面及骨间膜', '足舟骨粗隆及楔骨', '跖屈及内翻足，维持内侧纵弓', '胫神经', '三阴交/复溜/太溪深层主肌'),
    ('咬肌 (Masseter)', '颧弓下缘及内面', '下颌角及咬肌粗隆', '上提下颌骨闭口(咀嚼)', '三叉神经下颌神经', '颊车穴正位于咬肌隆起最高点'),
    ('颞肌 (Temporalis)', '颞窝骨面', '下颌骨冠突', '上提并后退下颌骨', '三叉神经下颌神经', '率谷/曲鬓/太阳穴深层主肌'),
    ('头夹肌 (Splenius Capitis)', '项韧带下部及C7-T3棘突', '颞骨乳突及上项线', '双侧收缩后仰头，单侧收缩同侧旋转', '颈神经后支', '风池/天柱深层，颈源性头痛高发肌'),
    ('腹外斜肌 (External Oblique)', '下8肋外面', '髂嵴前部、腹白线及腹股沟韧带', '屈脊柱、向对侧旋转躯干并增腹压', 'T7-T12肋间神经', '带脉/五枢/维道所在侧腹壁表层'),
    ('腹内斜肌 (Internal Oblique)', '胸腰筋膜、髂嵴、腹股沟韧带', '下3肋及腹白线', '屈脊柱、向同侧旋转躯干', 'T7-L1神经', '带脉穴中层肌腹')
  ]
  for n, o, i, act, nv, nurs in MORE_MUSCLES:
    if n not in m_names:
      muscles.append({'name': n, 'origin': o, 'insertion': i, 'action': act, 'nerve': nv, 'nursing': nurs})
      m_names.add(n)
  d['muscles'] = muscles

  rx = d.get('tcm_prescriptions', [])
  rx_names = {x.get('disease') for x in rx}
  MORE_RX = [
    {'disease': '颈型颈椎病（项痹病）', 'mainPoints': '风池、大椎、颈夹脊、天柱、后溪', 'adjunct': '外关、合谷、落枕穴', 'care': '避风寒，低枕仰卧（高度一拳），配合葛根汤或颈部米字操康复'},
    {'disease': '腰椎间盘突出症（腰痛）', 'mainPoints': '肾俞、大肠俞、腰阳关、委中、环跳', 'adjunct': '阳陵泉、悬钟、承山、昆仑', 'care': '急性期绝对卧硬板床，避免弯腰提重物，可配合督脉灸与腰围保护'},
    {'disease': '原发性痛经（寒凝血瘀）', 'mainPoints': '关元、三阴交、地机、十七椎、次髎', 'adjunct': '血海、太冲、归来', 'care': '经前3天开始艾灸关元/神阙，忌食生冷寒凉，注意腰腹保暖'},
    {'disease': '周围性面神经麻痹（口僻）', 'mainPoints': '阳白、四白、颧髎、颊车、地仓、合谷', 'adjunct': '翳风、牵正、足三里', 'care': '急性期避面部冷风直吹，眼睑闭合不全者睡前涂红霉素眼膏护角膜'},
    {'disease': '中风后偏瘫康复（恢复期）', 'mainPoints': '肩髃、曲池、手三里、合谷、环跳、阳陵泉、足三里', 'adjunct': '百会、风池、太冲、三阴交', 'care': '良肢位摆放防肩关节半脱位与足下垂，循序渐进进行被动-主动关节训练'},
    {'disease': '原发性高血压（肝阳上亢）', 'mainPoints': '风池、曲池、太冲、足三里、耳降压沟', 'adjunct': '百会、内关、太溪、涌泉', 'care': '低盐饮食，监测晨起血压，吴茱萸醋调敷贴涌泉穴引火下行'},
    {'disease': '支气管哮喘（缓解期扶正）', 'mainPoints': '肺俞、定喘、膻中、膏肓、足三里', 'adjunct': '太渊、丰隆、肾俞', 'care': '夏季三伏贴、冬季三九贴，避过敏原，腹式缩唇呼吸锻炼'},
    {'disease': '慢性胃炎/胃脘痛（脾胃虚寒）', 'mainPoints': '中脘、足三里、内关、脾俞、胃俞', 'adjunct': '公孙、梁丘、神阙(隔姜灸)', 'care': '少食多餐温软食物，忌辛辣生冷浓茶咖啡，配合雷火灸中脘'},
    {'disease': '膝骨性关节炎（鹤膝风）', 'mainPoints': '犊鼻、内膝眼、鹤顶、阳陵泉、阴陵泉、梁丘', 'adjunct': '血海、足三里、悬钟', 'care': '减少爬山及深蹲负重，坐位直腿抬高锻炼股四头肌内侧头'},
    {'disease': '顽固性失眠（心肾不交）', 'mainPoints': '神门、内关、三阴交、太溪、安眠、四神聪', 'adjunct': '心俞、肾俞、耳神门、涌泉', 'care': '睡前中药足浴(40℃温水15分钟)配合按压耳神门，减少睡前蓝光刺激'},
    {'disease': '带状疱疹后遗神经痛', 'mainPoints': '局部阿是穴围刺、对应夹脊穴、支沟、阳陵泉', 'adjunct': '合谷、太冲、血海', 'care': '保持皮损干燥防继发细菌感染，穿纯棉宽松衣物减少摩擦痛'},
    {'disease': '急性踝关节扭伤', 'mainPoints': '丘墟、昆仑、解溪、悬钟、商丘', 'adjunct': '阳陵泉、阿是穴(健侧对应缪刺)', 'care': '伤后48小时内遵循RICE原则冷敷制动，48小时后可活血消肿外敷'},
    {'disease': '产后乳汁分泌不足（缺乳）', 'mainPoints': '膻中、乳根、少泽、足三里', 'adjunct': '太冲、脾俞、肝俞', 'care': '早吸吮勤哺乳，保持心情舒畅，膻中穴禁用暴力深刺'},
    {'disease': '急性乳腺炎初期（乳痈）', 'mainPoints': '肩井、天宗、膻中、足三里、少泽', 'adjunct': '期门、太冲、行间', 'care': '排空乳汁防积乳成脓，局部可配合金黄散外敷或手法通乳'},
    {'disease': '慢性前列腺炎 / 尿潴留', 'mainPoints': '中极、关元、三阴交、阴陵泉、次髎', 'adjunct': '秩边、水道、太溪', 'care': '针刺中极/关元前嘱患者先排空膀胱，忌久坐骑行及辛辣饮酒'},
    {'disease': '过敏性鼻炎（鼻鼽）', 'mainPoints': '迎香、印堂、肺俞、合谷、足三里', 'adjunct': '风池、大椎、上星', 'care': '迎香穴向内上方斜刺通鼻窍，晨起冷水洗脸耐寒锻炼'}
  ]
  for r in MORE_RX:
    if r['disease'] not in rx_names:
      rx.append(r)
      rx_names.add(r['disease'])
  d['tcm_prescriptions'] = rx

  d['tcm_cutaneous_sinew'] = [
    {'name': '手太阴肺经筋 / 皮部', 'region': '胸部外上方、上臂前外侧、前臂桡侧掌面至大指端', 'pathology': '缺盆痛、肩前痛、肘挛、息贲（胸胁支满）'},
    {'name': '手阳明大肠经筋 / 皮部', 'region': '次指背侧、前臂背面桡侧、上臂外侧、肩髃至颊面', 'pathology': '肩不举、颈不可左右视、手腕痛'},
    {'name': '足阳明胃经筋 / 皮部', 'region': '足背第2-4趾、小腿前外侧、大腿前面、腹直肌区至面部', 'pathology': '转筋、膝跳痛、股前痛、口僻（面瘫）'},
    {'name': '足太阴脾经筋 / 皮部', 'region': '大趾内侧、内踝、小腿及大腿内侧、阴器至脐腹', 'pathology': '足大趾掣痛、内踝痛、转筋、阴器痛'},
    {'name': '手少阴心经筋 / 皮部', 'region': '小指内侧、前臂尺侧掌面、肘内廉、腋下至胸中', 'pathology': '内急心承伏梁、肘内廉掣痛'},
    {'name': '手太阳小肠经筋 / 皮部', 'region': '小指外侧、腕尺侧、肘后内侧、肩胛区至耳颌', 'pathology': '小指及肘内锐骨后痛、肩胛引颈痛、耳鸣'},
    {'name': '足太阳膀胱经筋 / 皮部', 'region': '小趾、足跟、小腿后面、腘窝、大腿后侧、脊柱两侧至项头', 'pathology': '小趾支跟痛、腘挛、脊反折、项筋急'},
    {'name': '足少阴肾经筋 / 皮部', 'region': '足底、内踝下、小腿内后侧、大腿内后侧至脊内', 'pathology': '足下转筋、癫痫、脊柱强直前俯不能后仰'},
    {'name': '手厥阴心包经筋 / 皮部', 'region': '中指、掌中、前臂掌侧正中、肘窝至腋下胸胁', 'pathology': '前臂筋急转筋、胸痛息贲'},
    {'name': '手少阳三焦经筋 / 皮部', 'region': '无名指、手背、前臂背面正中、肘尖、肩外侧至耳颞', 'pathology': '当所过者支转筋、舌卷'},
    {'name': '足少阳胆经筋 / 皮部', 'region': '第4趾、外踝、小腿外侧、膝外侧、股外侧、胁肋至颞侧', 'pathology': '小趾次趾转筋、膝不可屈伸、维筋相交'},
    {'name': '足厥阴肝经筋 / 皮部', 'region': '大趾背、内踝前、小腿内侧前缘、股内侧至前阴', 'pathology': '大趾痛、内踝前痛、转筋、阴器不用'}
  ]
  open(data_path, 'w', encoding='utf-8').write(json.dumps(d, ensure_ascii=False, indent=2))

dm_path = 'src/data_manager.js'
if os.path.exists(dm_path):
  dm = open(dm_path, encoding='utf-8').read()
  MORE_TA2 = """  ['pectoralis minor', '胸小肌'], ['teres major', '大圆肌'], ['teres minor', '小圆肌'],
  ['coracobrachialis', '喙肱肌'], ['brachialis', '肱肌'], ['anconeus', '肘肌'],
  ['flexor carpi ulnaris', '尺侧腕屈肌'], ['flexor carpi radialis', '桡侧腕屈肌'], ['palmaris longus', '掌长肌'],
  ['abductor pollicis', '拇展肌'], ['extensor pollicis', '拇伸肌'], ['flexor pollicis', '拇屈肌'],
  ['gluteus maximus', '臀大肌'], ['gluteus medius', '臀中肌'], ['gluteus minimus', '臀小肌'],
  ['tensor fasciae latae', '阔筋膜张肌'], ['iliotibial', '髂胫束'], ['tibialis posterior', '胫骨后肌'],
  ['splenius capitis', '头夹肌'], ['semispinalis', '半棘肌'], ['multifidus', '多裂肌'],
  ['interspinales', '棘间肌'], ['intertransversarii', '横突间肌'], ['rotatores', '回旋肌'],
  ['suboccipital', '枕下'], ['rectus capitis', '头直肌'], ['obliquus capitis', '头斜肌'],
  ['mylohyoid', '下颌舌骨肌'], ['digastric', '二腹肌'], ['stylohyoid', '茎突舌骨肌'],
  ['omohyoid', '肩胛舌骨肌'], ['sternohyoid', '胸骨舌骨肌'], ['thyrohyoid', '甲状舌骨肌'],
  ['buccinator', '颊肌'], ['mentalis', '颏肌'], ['risorius', '笑肌'], ['frontalis', '额肌'],
  ['corrugator', '皱眉肌'], ['procerus', '降眉间肌'], ['nasalis', '鼻肌'],
  ['levator palpebrae', '上睑提肌'], ['superior rectus', '上直肌'], ['inferior rectus', '下直肌'],
  ['medial rectus', '内直肌'], ['lateral rectus', '外直肌'], ['retina', '视网膜'],
  ['cornea', '角膜'], ['sclera', '巩膜'], ['choroid', '脉络膜'], ['iris', '虹膜'], ['lens', '晶状体'],
  ['cochlea', '耳蜗'], ['semicircular', '半规管'], ['tympanic', '鼓膜'], ['ossicle', '听小骨'],
  ['malleus', '锤骨'], ['incus', '砧骨'], ['stapes', '镫骨'], ['eustachian', '咽鼓管'],
  ['circle of willis', 'Willis动脉环'], ['basilar', '基底动脉'], ['vertebral artery', '椎动脉'],
  ['internal carotid', '颈内动脉'], ['external carotid', '颈外动脉'], ['common carotid', '颈总动脉'],
  ['internal jugular', '颈内静脉'], ['external jugular', '颈外静脉'], ['brachiocephalic', '头臂干/静脉'],
  ['thoracic duct', '胸导管'], ['cisterna chyli', '乳糜池'], ['lymph node', '淋巴结'],
  ['sinoatrial', '窦房结'], ['atrioventricular', '房室结'], ['purkinje', '浦肯野纤维'],
  ['chordae tendineae', '腱索'], ['papillary muscle', '乳头肌'], ['foramen ovale', '卵圆孔'],
  ['coronary sinus', '冠状窦'], ['aortic arch', '主动脉弓'], ['ascending aorta', '升主动脉'],
  ['descending aorta', '降主动脉'], ['abdominal aorta', '腹主动脉'], ['common iliac', '髂总'],
  ['internal iliac', '髂内'], ['external iliac', '髂外'], ['popliteal artery', '腘动脉'],
  ['dorsalis pedis', '足背动脉'], ['anterior tibial', '胫前'], ['posterior tibial', '胫后'],
  ['retinaculum', '支持带'], ['aponeurosis', '腱膜'], ['meniscus', '半月板'],
  ['cruciate ligament', '交叉韧带'], ['collateral ligament', '副韧带'], ['rotator cuff', '肩袖'],
  ['carpal tunnel', '腕管'], ['tarsal tunnel', '跗管'], ['cubital tunnel', '肘管'],
  ['sciatic foramen', '坐骨孔'], ['obturator foramen', '闭孔'], ['jugular foramen', '颈静脉孔'],
  ['foramen magnum', '枕骨大孔'], ['optic canal', '视神经管'], ['cribriform', '筛板'],
  ['sella turcica', '蝶鞍'], ['pituitary fossa', '垂体窝'], ['crista galli', '鸡冠'],
  ['odontoid', '齿突'], ['atlas', '寰椎(C1)'], ['axis', '枢椎(C2)'], ['prominens', '隆椎(C7)'],
  ['costal cartilage', '肋软骨'], ['xiphisternal', '剑胸结合'], ['manubriosternal', '胸骨角'],
  ['iliac crest', '髂嵴'], ['ischial spine', '坐骨棘'], ['ischial tuberosity', '坐骨结节'],
  ['pubic tubercle', '耻骨结节'], ['greater trochanter', '大转子'], ['lesser trochanter', '小转子'],
  ['linea aspera', '股骨粗线'], ['medial malleolus', '内踝'], ['lateral malleolus', '外踝'],
  ['head of fibula', '腓骨头'], ['head of radius', '桡骨头'], ['radial tuberosity', '桡骨粗隆'],
  ['ulnar tuberosity', '尺骨粗隆'], ['trochlea', '滑车'], ['capitulum', '肱骨小头'],
  ['supraspinous', '冈上'], ['infraspinous', '冈下'], ['subscapular', '肩胛下'],
  ['cauda equina', '马尾'], ['filum terminale', '终丝'], ['conus medullaris', '脊髓圆锥'],
  ['pons', '脑桥'], ['cerebellar', '小脑'], ['basal ganglia', '基底节'], ['putamen', '壳核'],
  ['caudate', '尾状核'], ['globus pallidus', '苍白球'], ['substantia nigra', '黑质'],
  ['fornix', '穹窿'], ['cingulate', '扣带回'], ['precentral', '中央前回'], ['postcentral', '中央后回'],
  ['broca', 'Broca区'], ['wernicke', 'Wernicke区'], ['insula', '岛叶'],
  ['gallbladder', '胆囊'], ['common bile duct', '胆总管'], ['cystic duct', '胆囊管'],
  ['hepatic duct', '肝管'], ['pancreatic duct', '胰管'], ['sphincter of oddi', 'Oddi括约肌'],
  ['pylorus', '幽门'], ['fundus', '胃底/眼底/子宫底'], ['cardia', '贲门'],
  ['ascending colon', '升结肠'], ['transverse colon', '横结肠'], ['descending colon', '降结肠'],
  ['ileocecal', '回盲瓣'], ['mesentery', '肠系膜'], ['omentum', '网膜'],
  ['renal cortex', '肾皮质'], ['renal medulla', '肾髓质'], ['renal pelvis', '肾盂'],
  ['renal pyramid', '肾锥体'], ['calyx', '肾盏'], ['urethra', '尿道'],
  ['epididymis', '附睾'], ['vas deferens', '输精管'], ['endometrium', '子宫内膜'],
  ['myometrium', '子宫肌层'], ['cervix', '宫颈'], ['broad ligament', '阔韧带'],"""
  if "'pectoralis minor'" not in dm and "const ANAT_DICT = [" in dm:
    dm = dm.replace("const ANAT_DICT = [", "const ANAT_DICT = [\n" + MORE_TA2, 1)
    open(dm_path, 'w', encoding='utf-8').write(dm)
