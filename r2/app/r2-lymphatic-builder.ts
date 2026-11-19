// Procedural 3D Human Lymphatic System Builder
import * as T from 'three';

export interface ExtraAnatMeta {
  id: string;
  name: string;
  en: string;
  system: 'lymphatic' | 'endocrine' | 'ligament';
  region: 'head' | 'torso' | 'arm_l' | 'arm_r' | 'pelvis' | 'leg_l' | 'leg_r';
  desc: string;
  clinical: string;
  worldPos?: [number, number, number];
}

export type AnatRegion = ExtraAnatMeta['region'];

interface LymphNodeClusterSpec {
  id: string;
  region: AnatRegion;
  center: T.Vector3;
  spread: T.Vector3;
  count: number;
  scale: number;
  seed: number;
}

interface TrunkSpec {
  id: string;
  region: AnatRegion;
  points: T.Vector3[];
  radius: number;
  isDuct?: boolean;
}

const REGION_EXPLODE_MAP: Record<AnatRegion, [number, number, number]> = {
  head: [0, 0.14, 0.04],
  torso: [0, 0.02, 0.12],
  arm_l: [0.18, 0.03, 0],
  arm_r: [-0.18, 0.03, 0],
  pelvis: [0, -0.06, 0.1],
  leg_l: [0.1, -0.14, 0.03],
  leg_r: [-0.1, -0.14, 0.03],
};

export const LYMPH_SEARCH_INDEX: ExtraAnatMeta[] = [
  // 1. 淋巴器官 (Lymphoid Organs)
  { id: 'lymph_thymus', name: '胸腺', en: 'Thymus', system: 'lymphatic', region: 'torso', desc: '位于前上纵隔胸骨柄后方，分左右两叶，是T淋巴细胞分化成熟的中枢免疫器官。', clinical: '胸腺瘤、重症肌无力及儿童免疫发育评估的重要靶器官。' },
  { id: 'lymph_spleen', name: '脾', en: 'Spleen', system: 'lymphatic', region: 'torso', desc: '位于左季肋区第9-11肋深面，人体最大的外周免疫器官，兼具滤血与造血贮血功能。', clinical: '脾肿大、外伤性脾破裂及门静脉高压的重要评估结构。' },
  { id: 'lymph_tonsil_pharyngeal', name: '咽扁桃体 (腺样体)', en: 'Pharyngeal Tonsil (Adenoid)', system: 'lymphatic', region: 'head', desc: '位于鼻咽顶后壁黏膜内，构成咽淋巴环(Waldeyer环)上壁屏障。', clinical: '小儿腺样体肥大可致鼻塞、张口呼吸及分泌性中耳炎。' },
  { id: 'lymph_tonsil_tubal', name: '咽鼓管扁桃体', en: 'Tubal Tonsil', system: 'lymphatic', region: 'head', desc: '成对位于咽鼓管咽口周围，参与咽淋巴环侧壁免疫防御。', clinical: '肿大可压迫咽鼓管咽口引起传导性听力下降。' },
  { id: 'lymph_tonsil_palatine', name: '腭扁桃体', en: 'Palatine Tonsil', system: 'lymphatic', region: 'head', desc: '成对位于腭舌弓与腭咽弓之间的扁桃体窝内，为咽淋巴环最易受累结构。', clinical: '急性化脓性扁桃体炎及扁桃体周围脓肿好发部位。' },
  { id: 'lymph_tonsil_lingual', name: '舌扁桃体', en: 'Lingual Tonsil', system: 'lymphatic', region: 'head', desc: '位于舌根部界沟后方黏膜内，构成咽淋巴环下壁。', clinical: '慢性咽炎或舌根淋巴滤泡增生常致咽部异物感。' },
  { id: 'lymph_appendix', name: '阑尾集合淋巴滤泡', en: 'Appendix Aggregated Lymphoid Follicles', system: 'lymphatic', region: 'pelvis', desc: '位于盲肠末端蚓状突起黏膜下层，富含B细胞生发中心与集合淋巴滤泡。', clinical: '急性阑尾炎麦氏点压痛及肠道黏膜免疫屏障关键部位。' },
  // 2. 九大淋巴干与两大导管 (9 Trunks & 2 Ducts)
  { id: 'lymph_cisterna_chyli', name: '乳糜池', en: 'Cisterna Chyli', system: 'lymphatic', region: 'torso', desc: '位于L1-L2椎体前方、腹主动脉右后方的囊状膨大，汇集左右腰干与肠干淋巴。', clinical: '腹部手术或外伤损伤可致乳糜腹水。' },
  { id: 'lymph_thoracic_duct', name: '胸导管', en: 'Thoracic Duct', system: 'lymphatic', region: 'torso', desc: '起自乳糜池，经主动脉裂孔入胸腔后纵隔上行，收集全身约3/4区域淋巴。', clinical: '食管或纵隔手术损伤胸导管易引发左侧乳糜胸。' },
  { id: 'lymph_thoracic_arch', name: '胸导管弓', en: 'Thoracic Duct Arch', system: 'lymphatic', region: 'head', desc: '胸导管上行至C7高度向左弯曲成弓，跨过锁骨下动脉注入左静脉角。', clinical: '左锁骨上区手术需注意保护，避免淋巴漏。' },
  { id: 'lymph_right_duct', name: '右淋巴导管', en: 'Right Lymphatic Duct', system: 'lymphatic', region: 'head', desc: '短干长约1-1.5cm，汇集右颈干、右锁骨下干与右支气管纵隔干，注入右静脉角。', clinical: '收集右上半身约1/4区域淋巴，损伤可致右侧乳糜胸。' },
  { id: 'lymph_lumbar_trunk_l', name: '左腰干', en: 'Left Lumbar Trunk', system: 'lymphatic', region: 'torso', desc: '起自左腰淋巴结，收集左下肢、盆部及腹壁左侧淋巴，注入乳糜池。', clinical: '腹膜后肿瘤或腹主动脉旁淋巴结清扫重点解剖标志。' },
  { id: 'lymph_lumbar_trunk_r', name: '右腰干', en: 'Right Lumbar Trunk', system: 'lymphatic', region: 'torso', desc: '起自右腰淋巴结，收集右下肢、盆部及腹壁右侧淋巴，注入乳糜池。', clinical: '睾丸/卵巢恶性肿瘤淋巴转移主要上行通路。' },
  { id: 'lymph_intestinal_trunk', name: '肠干', en: 'Intestinal Trunk', system: 'lymphatic', region: 'torso', desc: '汇集腹腔、肠系膜上及肠系膜下淋巴结输出管，富含乳糜微粒，注入乳糜池。', clinical: '肠道脂肪吸收与乳糜性腹水病理核心通道。' },
  { id: 'lymph_jugular_trunk_l', name: '左颈干', en: 'Left Jugular Trunk', system: 'lymphatic', region: 'head', desc: '收集头颈部左侧深层淋巴，沿颈内静脉下行注入胸导管弓或左静脉角。', clinical: '头颈部肿瘤颈清扫术重要回流主干。' },
  { id: 'lymph_jugular_trunk_r', name: '右颈干', en: 'Right Jugular Trunk', system: 'lymphatic', region: 'head', desc: '收集头颈部右侧深层淋巴，注入右淋巴导管或右静脉角。', clinical: '甲状腺及喉咽癌右侧颈淋巴结转移通路。' },
  { id: 'lymph_subclavian_trunk_l', name: '左锁骨下干', en: 'Left Subclavian Trunk', system: 'lymphatic', region: 'arm_l', desc: '起自左腋尖淋巴结，沿锁骨下静脉上缘内行注入胸导管或左静脉角。', clinical: '乳腺癌左腋窝转移后,向锁骨上及静脉角引流主干。' },
  { id: 'lymph_subclavian_trunk_r', name: '右锁骨下干', en: 'Right Subclavian Trunk', system: 'lymphatic', region: 'arm_r', desc: '起自右腋尖淋巴结，注入右淋巴导管或右静脉角。', clinical: '右上肢及右乳腺淋巴回流终点干。' },
  // 3. 头颈部淋巴结群 (Head & Neck Nodes)
  { id: 'lymph_occipital', name: '枕淋巴结', en: 'Occipital Nodes', system: 'lymphatic', region: 'head', desc: '位于枕骨大孔后方斜方肌起点表面，收集枕部及项上部淋巴。', clinical: '头皮枕部感染或风疹常致此群肿大压痛。' },
  { id: 'lymph_mastoid', name: '乳突淋巴结 (耳后)', en: 'Mastoid (Retroauricular) Nodes', system: 'lymphatic', region: 'head', desc: '位于颞骨乳突表面，收集颞顶区、耳廓后面及外耳道淋巴。', clinical: '外耳道炎、中耳乳突炎及风疹典型肿大部位。' },
  { id: 'lymph_parotid_sup_deep', name: '腮腺浅深淋巴结', en: 'Superficial & Deep Parotid Nodes', system: 'lymphatic', region: 'head', desc: '分浅层(腮腺咬肌筋膜表面)与深层(腮腺实质内)，收集额颞、眼睑及外耳道淋巴。', clinical: '腮腺肿瘤及眼睑/颞部皮肤肿瘤转移哨兵结。' },
  { id: 'lymph_facial', name: '面淋巴结', en: 'Facial (Buccal/Infraorbital) Nodes', system: 'lymphatic', region: 'head', desc: '沿面动脉与面静脉分布(颊肌、鼻唇沟、下颌骨体外侧)，收集面部软组织淋巴。', clinical: '牙源性面部感染及面部皮肤癌转移途径。' },
  { id: 'lymph_submandibular', name: '下颌下淋巴结', en: 'Submandibular Nodes', system: 'lymphatic', region: 'head', desc: '位于下颌下三角内下颌下腺附近，收集鼻腔、口唇、颊、舌前2/3及牙龈淋巴。', clinical: '口腔颌面部感染与口腔癌最常受累的淋巴结群。' },
  { id: 'lymph_submental', name: '颏下淋巴结', en: 'Submental Nodes', system: 'lymphatic', region: 'head', desc: '位于颏下三角内二腹肌前腹之间，收集下唇中部、颏部、舌尖及口底前部淋巴。', clinical: '下唇癌及舌尖肿瘤双侧淋巴转移首站。' },
  { id: 'lymph_ant_cervical', name: '颈前浅深淋巴结', en: 'Anterior Cervical Superficial & Deep Nodes', system: 'lymphatic', region: 'head', desc: '沿颈前静脉及喉、气管、甲状腺前面分布，含喉前、气管前及气管旁结。', clinical: '甲状腺癌、喉癌及气管病变核心引流区域。' },
  { id: 'lymph_lat_cervical_sup', name: '颈外侧浅淋巴结', en: 'Superficial Lateral Cervical Nodes', system: 'lymphatic', region: 'head', desc: '沿颈外静脉排列于胸锁乳突肌浅面，收集耳廓及腮腺区浅层淋巴。', clinical: '颈侧浅表感染或淋巴瘤常见触及结节区。' },
  { id: 'lymph_lat_cervical_deep_ang', name: '颈外侧深淋巴结 (含角淋巴结)', en: 'Deep Lateral Cervical & Jugulodigastric Nodes', system: 'lymphatic', region: 'head', desc: '沿颈内静脉排列，上端颈二腹肌淋巴结(角淋巴结)收集腭扁桃体及舌根淋巴。', clinical: '急性扁桃体炎及口咽癌标志性肿大结节。' },
  { id: 'lymph_virchow', name: 'Virchow 锁骨上淋巴结', en: 'Virchow Supraclavicular Node', system: 'lymphatic', region: 'head', desc: '位于左锁骨上窝胸导管弓注入左静脉角附近，属颈外侧深下群。', clinical: '胃癌、食管癌及腹盆腔恶性肿瘤经胸导管逆行转移的重要体征(Troisier征)。' },
  { id: 'lymph_retropharyngeal', name: '咽后淋巴结', en: 'Retropharyngeal Nodes', system: 'lymphatic', region: 'head', desc: '位于咽后壁与椎前筋膜之间咽后间隙内，收集鼻腔后部、鼻咽及咽鼓管淋巴。', clinical: '鼻咽癌早期转移首站及小儿咽后脓肿好发部位。' },
  // 4. 上肢与腋窝 (Upper Limb & Axilla)
  { id: 'lymph_axillary_apical', name: '腋窝尖淋巴结', en: 'Apical Axillary Nodes', system: 'lymphatic', region: 'arm_l', desc: '位于腋窝顶部第1肋外缘与胸小肌上缘之间，汇集其余4群腋淋巴结输出管。', clinical: '乳腺癌腋窝Ⅲ水平清扫关键站，输出管合成锁骨下干。' },
  { id: 'lymph_axillary_central', name: '腋窝中央淋巴结', en: 'Central Axillary Nodes', system: 'lymphatic', region: 'arm_l', desc: '位于腋窝中央脂肪垫内，接受前、后、外侧三群淋巴结输出管。', clinical: '乳腺癌腋窝Ⅱ水平淋巴结活检与分期核心。' },
  { id: 'lymph_axillary_lateral', name: '腋窝外侧(肱)淋巴结', en: 'Lateral (Humeral) Axillary Nodes', system: 'lymphatic', region: 'arm_l', desc: '沿腋静脉远侧端排列，收集上肢绝大部分深浅淋巴。', clinical: '上肢感染或黑色素瘤腋窝转移首站。' },
  { id: 'lymph_axillary_pectoral', name: '腋窝胸肌(前)淋巴结', en: 'Pectoral (Anterior) Axillary Nodes', system: 'lymphatic', region: 'arm_l', desc: '沿胸外侧血管排列于胸大肌下缘，收集脐以上前外侧胸壁及乳房外侧淋巴。', clinical: '乳腺癌最常见前哨淋巴结所在群。' },
  { id: 'lymph_axillary_subscapular', name: '腋窝肩胛下(后)淋巴结', en: 'Subscapular (Posterior) Axillary Nodes', system: 'lymphatic', region: 'arm_l', desc: '沿肩胛下血管排列于腋后壁，收集背上部及肩胛区淋巴。', clinical: '背部及肩胛区皮肤恶性肿瘤引流站。' },
  { id: 'lymph_cubital', name: '肘(滑车上)淋巴结', en: 'Cubital (Epitrochlear) Nodes', system: 'lymphatic', region: 'arm_l', desc: '位于肱骨内上髁上方贵要静脉旁，收集前臂尺侧及第3-5指浅淋巴。', clinical: '手部尺侧感染或猫抓病典型肘内侧肿大结节。' },
  { id: 'lymph_deltopectoral', name: '三角胸大肌淋巴结', en: 'Deltopectoral (Infraclavicular) Nodes', system: 'lymphatic', region: 'arm_r', desc: '位于三角肌与胸大肌间沟内头静脉旁，收集前臂桡侧及肩部浅淋巴。', clinical: '可绕过腋窝直接引流至腋尖或锁骨上淋巴结。' },
  { id: 'lymph_arm_vessels', name: '上肢浅深淋巴管网', en: 'Upper Limb Superficial & Deep Lymphatic Vessels', system: 'lymphatic', region: 'arm_r', desc: '浅淋巴管伴头静脉/贵要静脉上行，深淋巴管伴桡尺肱动脉伴行至腋窝。', clinical: '乳腺癌根治术后上肢淋巴水肿病理基础。' },
  // 5. 胸部 (Thorax)
  { id: 'lymph_parasternal', name: '胸骨旁(乳内)淋巴结', en: 'Parasternal (Internal Thoracic) Nodes', system: 'lymphatic', region: 'torso', desc: '沿胸廓内血管排列于第1-5肋间隙，收集乳房内侧部及前胸壁深层淋巴。', clinical: '乳腺内侧象限肿瘤内乳区转移关键靶区。' },
  { id: 'lymph_intercostal', name: '肋间淋巴结', en: 'Intercostal Nodes', system: 'lymphatic', region: 'torso', desc: '位于肋间隙后端肋头附近，收集后胸壁深层及壁胸膜淋巴。', clinical: '胸膜及胸壁肿瘤向胸导管或纵隔转移路径。' },
  { id: 'lymph_sup_diaphragmatic', name: '膈上淋巴结', en: 'Superior Diaphragmatic Nodes', system: 'lymphatic', region: 'torso', desc: '位于膈肌胸腔面分前/中/后三群，收集膈、肝裸区及心包下部淋巴。', clinical: '肝顶部肿瘤跨膈向纵隔转移桥梁。' },
  { id: 'lymph_mediastinal_ant_post', name: '纵隔前后淋巴结', en: 'Anterior & Posterior Mediastinal Nodes', system: 'lymphatic', region: 'torso', desc: '前纵隔结位于大血管前(含胸腺区)，后纵隔结沿食管及胸主动脉排列。', clinical: '淋巴瘤、胸腺瘤及食管癌纵隔分期核心靶区。' },
  { id: 'lymph_pulmonary_broncho', name: '肺与支气管肺(肺门)淋巴结', en: 'Pulmonary & Bronchopulmonary (Hilar) Nodes', system: 'lymphatic', region: 'torso', desc: '肺内结位于叶段支气管分叉，支气管肺结(N1)位于肺门主支气管周围。', clinical: '肺癌TNM分期N1站评估核心。' },
  { id: 'lymph_tracheobronchial_para', name: '气管支气管与气管旁淋巴结', en: 'Tracheobronchial & Paratracheal Nodes', system: 'lymphatic', region: 'torso', desc: '含隆突下(7区)、气管支气管上/下结及左右气管旁结(2/4区)。', clinical: '肺癌N2纵隔淋巴结分期及TBNA穿刺活检重点站。' },
  // 6. 腹部 (Abdomen)
  { id: 'lymph_inf_epigastric', name: '腹壁下淋巴结', en: 'Inferior Epigastric Nodes', system: 'lymphatic', region: 'torso', desc: '沿腹壁下血管排列于腹直肌鞘深面，收集下腹壁深层淋巴。', clinical: '下腹壁肿瘤及腹股沟/髂外淋巴交通支。' },
  { id: 'lymph_inf_phrenic', name: '膈下淋巴结', en: 'Inferior Phrenic Nodes', system: 'lymphatic', region: 'torso', desc: '位于膈肌腹腔面膈下血管旁，收集膈下及肝上部淋巴。', clinical: '肝癌及胃底癌向腹腔干或纵隔转移途径。' },
  { id: 'lymph_lumbar_abdo', name: '腰淋巴结 (主动脉旁/腔静脉旁)', en: 'Lumbar (Para-aortic & Paracaval) Nodes', system: 'lymphatic', region: 'torso', desc: '沿腹主动脉与下腔静脉周围成链排列，汇集盆部、肾、肾上腺及性腺淋巴。', clinical: '腹膜后淋巴结清扫(RPLND)核心区域。' },
  { id: 'lymph_renal_gonadal', name: '肾与性腺淋巴结', en: 'Renal & Gonadal Lymph Nodes', system: 'lymphatic', region: 'torso', desc: '位于肾门及睾丸/卵巢血管沿线，分别引流肾脏与生殖腺淋巴至腰淋巴结。', clinical: '肾癌及生殖细胞肿瘤腹膜后跳跃转移常见区。' },
  { id: 'lymph_celiac_cascade', name: '腹腔干级联淋巴结', en: 'Celiac Trunk Cascade Nodes', system: 'lymphatic', region: 'torso', desc: '以腹腔干为中心分胃左、肝总、脾门三级级联结，收集胃、肝、胆、胰、脾淋巴。', clinical: '胃癌D2根治术(第7/8/9/10/11组)核心清扫靶区。' },
  { id: 'lymph_sma_3tier', name: '肠系膜上三级弓淋巴结', en: 'Superior Mesenteric 3-Tier Arcade Nodes', system: 'lymphatic', region: 'torso', desc: '沿肠系膜上动脉主干、中央弓及肠壁缘动脉弓三级分布，收集空回肠及右半结肠淋巴。', clinical: '右半结肠癌CME手术D3站清扫解剖基础。' },
  { id: 'lymph_ima_nodes', name: '肠系膜下淋巴结', en: 'Inferior Mesenteric Nodes', system: 'lymphatic', region: 'torso', desc: '沿肠系膜下动脉及其分支排列，收集降结肠、乙状结肠及直肠上段淋巴。', clinical: '左半结肠及直肠癌根治术253组淋巴结清扫关键标志。' },
  // 7. 盆部 (Pelvis)
  { id: 'lymph_ext_iliac', name: '髂外淋巴结', en: 'External Iliac Nodes', system: 'lymphatic', region: 'pelvis', desc: '沿髂外血管排列，接受腹股沟深淋巴结、膀胱及子宫颈部分淋巴。', clinical: '妇科肿瘤与前列腺癌盆腔淋巴结清扫外侧界。' },
  { id: 'lymph_int_iliac_obt_sac', name: '髂内淋巴结 (含闭孔与骶结)', en: 'Internal Iliac (Obturator & Sacral) Nodes', system: 'lymphatic', region: 'pelvis', desc: '沿髂内血管、闭孔神经及骶骨前面分布，收集盆腔脏器及直肠下段淋巴。', clinical: '直肠癌侧方淋巴结转移及宫颈癌闭孔窝清扫核心。' },
  { id: 'lymph_common_iliac', name: '髂总淋巴结', en: 'Common Iliac Nodes', system: 'lymphatic', region: 'pelvis', desc: '沿髂总血管排列，汇集髂外与髂内淋巴结输出管，向上注入腰淋巴结。', clinical: '盆腔肿瘤向腹膜后腰淋巴结转移必经之路。' },
  // 8. 下肢 (Lower Limb)
  { id: 'lymph_popliteal', name: '腘淋巴结', en: 'Popliteal Nodes', system: 'lymphatic', region: 'leg_l', desc: '位于腘窝深筋膜深面小隐静脉末端及腘血管旁，收集小腿后外侧及足外侧缘淋巴。', clinical: '足跟或小腿外侧感染/黑色素瘤腘窝转移首站。' },
  { id: 'lymph_inguinal_sup_t', name: '腹股沟浅淋巴结 (T形上下群)', en: 'Superficial Inguinal Nodes (T-shaped Upper/Lower)', system: 'lymphatic', region: 'leg_l', desc: '上群沿腹股沟韧带下方横行排列，下群沿大隐静脉末端纵行排列呈T形。', clinical: '下肢、外阴、会阴及肛管下部病变常见肿大淋巴结群。' },
  { id: 'lymph_inguinal_deep_cloquet', name: '腹股沟深淋巴结 (含Cloquet结)', en: 'Deep Inguinal Nodes (incl. Cloquet Node)', system: 'lymphatic', region: 'leg_r', desc: '位于股静脉内侧股管内，最高位称Cloquet(Rosenmüller)结，位于股环处。', clinical: '股疝鉴别诊断及外阴/下肢深层肿瘤向髂外转移哨兵结。' },
  { id: 'lymph_leg_vessels', name: '下肢浅深淋巴管网', en: 'Lower Limb Superficial & Deep Lymphatic Vessels', system: 'lymphatic', region: 'leg_r', desc: '浅淋巴管伴大/小隐静脉上行，深淋巴管伴胫前/后及股血管上行至腹股沟深结。', clinical: '丝虫病象皮肿或盆腔术后下肢淋巴水肿核心通路。' },

  { id: 'lymph_bronchomediastinal_l', name: '左支气管纵隔干', en: 'Left Bronchomediastinal Trunk', system: 'lymphatic', region: 'torso', desc: '收集左肺、左支气管、心包及左半胸壁深层淋巴，注入胸导管。', clinical: '左肺肺癌纵隔淋巴结分期关键引流路径。' },
  { id: 'lymph_bronchomediastinal_r', name: '右支气管纵隔干', en: 'Right Bronchomediastinal Trunk', system: 'lymphatic', region: 'torso', desc: '收集右肺、右支气管及右半胸壁深层淋巴，注入右淋巴导管。', clinical: '右肺及纵隔肿瘤向右侧静脉角转移通路。'},
];

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createBeanNodeGeometry(): T.BufferGeometry {
  const geo = new T.SphereGeometry(1, 14, 10);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);
    // Kidney/bean indentation (hilum) on -X side and elongation along Y
    const yNorm = y;
    const hilum = x < 0 ? Math.exp(-yNorm * yNorm * 2.6) * 0.42 : 0;
    x = x * 0.72 + hilum;
    y = y * 1.18;
    z = z * 0.56;
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  return geo;
}

function createHitbox(
  meta: ExtraAnatMeta,
  center: T.Vector3,
  radius: number | [number, number, number],
  mat: T.Material
): T.Mesh {
  const geo = new T.SphereGeometry(1, 8, 8);
  const mesh = new T.Mesh(geo, mat);
  mesh.position.copy(center);
  if (typeof radius === 'number') {
    mesh.scale.setScalar(radius);
  } else {
    mesh.scale.set(radius[0], radius[1], radius[2]);
  }
  mesh.visible = false;
  mesh.name = `hitbox_${meta.id}`;
  mesh.userData = {
    isHitbox: true,
    anatMeta: meta,
    region: meta.region,
    explodeOffset: new T.Vector3(...REGION_EXPLODE_MAP[meta.region]),
  };
  return mesh;
}

function buildLymphoidOrgans(
  anchor: (rx: number, ry: number, rz: number) => T.Vector3,
  s: number,
  isFemale: boolean,
  organMat: T.Material,
  tonsilMat: T.Material,
  hitboxMat: T.Material,
  registerMeta: (id: string, worldPos: T.Vector3, hitRadius: number | [number, number, number]) => void
): { group: T.Group; hitboxes: T.Object3D[] } {
  const group = new T.Group();
  group.name = 'lymph_organs';
  const hitboxes: T.Object3D[] = [];

  // 1. 胸腺 (Thymus) - bilobed anterior superior mediastinum
  const thymusGroup = new T.Group();
  const thymusPos = anchor(0, 0.725, 0.24);
  thymusGroup.position.copy(thymusPos);
  thymusGroup.userData = { region: 'torso', explodeOffset: new T.Vector3(...REGION_EXPLODE_MAP.torso) };
  for (const side of [-1, 1]) {
    const lobeGeo = new T.SphereGeometry(0.022 * s, 14, 12);
    lobeGeo.scale(0.68, 1.55, 0.45);
    const lobe = new T.Mesh(lobeGeo, organMat);
    lobe.position.set(side * 0.013 * s, 0, 0);
    lobe.rotation.z = -side * 0.16;
    thymusGroup.add(lobe);
  }
  group.add(thymusGroup);
  registerMeta('lymph_thymus', thymusPos, 0.045 * s);

  // 2. 脾 (Spleen) - left hypochondrium bean-wedge
  const spleenPos = anchor(isFemale ? 0.34 : 0.36, 0.575, -0.08);
  const spleenGeo = new T.SphereGeometry(0.038 * s, 16, 12);
  const sPosAttr = spleenGeo.attributes.position;
  for (let i = 0; i < sPosAttr.count; i++) {
    const x = sPosAttr.getX(i);
    const y = sPosAttr.getY(i);
    const z = sPosAttr.getZ(i);
    const indent = x < 0 ? Math.exp(-(y * y) * 900) * 0.008 * s : 0;
    sPosAttr.setXYZ(i, x * 0.72 + indent, y * 1.32, z * 0.92);
  }
  spleenGeo.computeVertexNormals();
  const spleenMesh = new T.Mesh(spleenGeo, organMat);
  spleenMesh.position.copy(spleenPos);
  spleenMesh.rotation.set(0.25, 0.2, -0.35);
  spleenMesh.userData = { region: 'torso', explodeOffset: new T.Vector3(...REGION_EXPLODE_MAP.torso) };
  group.add(spleenMesh);
  registerMeta('lymph_spleen', spleenPos, 0.055 * s);

  // 3. 咽淋巴环 4 扁桃体 (Waldeyer's Ring: Pharyngeal, Tubal, Palatine, Lingual)
  const pharPos = anchor(0, 0.905, 0.02);
  const pharMesh = new T.Mesh(new T.SphereGeometry(0.011 * s, 10, 8), tonsilMat);
  pharMesh.scale.set(1.2, 0.85, 0.65);
  pharMesh.position.copy(pharPos);
  pharMesh.userData = { region: 'head', explodeOffset: new T.Vector3(...REGION_EXPLODE_MAP.head) };
  group.add(pharMesh);
  registerMeta('lymph_tonsil_pharyngeal', pharPos, 0.024 * s);

  const tubalCenter = anchor(0, 0.892, 0.055);
  for (const side of [-1, 1]) {
    const tMesh = new T.Mesh(new T.SphereGeometry(0.007 * s, 8, 8), tonsilMat);
    tMesh.position.copy(anchor(side * 0.065, 0.892, 0.055));
    tMesh.userData = { region: 'head', explodeOffset: new T.Vector3(...REGION_EXPLODE_MAP.head) };
    group.add(tMesh);
  }
  registerMeta('lymph_tonsil_tubal', tubalCenter, 0.026 * s);

  const palCenter = anchor(0, 0.875, 0.095);
  for (const side of [-1, 1]) {
    const pMesh = new T.Mesh(new T.SphereGeometry(0.0095 * s, 10, 8), tonsilMat);
    pMesh.scale.set(0.75, 1.25, 0.85);
    pMesh.position.copy(anchor(side * 0.055, 0.875, 0.095));
    pMesh.userData = { region: 'head', explodeOffset: new T.Vector3(...REGION_EXPLODE_MAP.head) };
    group.add(pMesh);
  }
  registerMeta('lymph_tonsil_palatine', palCenter, 0.026 * s);

  const lingPos = anchor(0, 0.86, 0.125);
  const lingMesh = new T.Mesh(new T.SphereGeometry(0.011 * s, 10, 8), tonsilMat);
  lingMesh.scale.set(1.35, 0.55, 0.85);
  lingMesh.position.copy(lingPos);
  lingMesh.userData = { region: 'head', explodeOffset: new T.Vector3(...REGION_EXPLODE_MAP.head) };
  group.add(lingMesh);
  registerMeta('lymph_tonsil_lingual', lingPos, 0.024 * s);

  // 4. 阑尾集合淋巴滤泡 (Appendix Aggregated Lymphoid Follicles)
  const appBase = anchor(isFemale ? -0.22 : -0.20, 0.43, 0.16);
  const appCurve = new T.CatmullRomCurve3([
    appBase.clone(),
    appBase.clone().add(new T.Vector3(0.012 * s, -0.022 * s, 0.008 * s)),
    appBase.clone().add(new T.Vector3(0.028 * s, -0.036 * s, -0.005 * s)),
    appBase.clone().add(new T.Vector3(0.034 * s, -0.025 * s, -0.015 * s)),
  ]);
  const appMesh = new T.Mesh(new T.TubeGeometry(appCurve, 16, 0.0065 * s, 8, false), organMat);
  appMesh.userData = { region: 'pelvis', explodeOffset: new T.Vector3(...REGION_EXPLODE_MAP.pelvis) };
  group.add(appMesh);
  for (let i = 0; i < 6; i++) {
    const fPt = appCurve.getPoint((i + 0.5) / 6);
    const fol = new T.Mesh(new T.SphereGeometry(0.0042 * s, 6, 6), tonsilMat);
    fol.position.copy(fPt);
    fol.userData = { region: 'pelvis', explodeOffset: new T.Vector3(...REGION_EXPLODE_MAP.pelvis) };
    group.add(fol);
  }
  registerMeta('lymph_appendix', appBase, 0.036 * s);

  void hitboxMat;
  return { group, hitboxes };
}

export function buildFullLymphaticSystem(
  bodyBox: T.Box3,
  sex: string
): { group: T.Group; metas: ExtraAnatMeta[]; hitTargets: T.Object3D[] } {
  const group = new T.Group();
  group.name = 'lymphatic_system_root';

  const size = new T.Vector3();
  const center = new T.Vector3();
  bodyBox.getSize(size);
  bodyBox.getCenter(center);

  const H = size.y > 0.1 ? size.y : 1.72;
  const W = size.x > 0.1 ? size.x : 0.48;
  const D = size.z > 0.1 ? size.z : 0.28;
  const s = H / 1.72;
  const isFemale = sex.toLowerCase().startsWith('f') || sex === '女';

  // 双性别动态锚点适配 (Dual-gender dynamic anchor)
  const anchor = (rx: number, ry: number, rz: number): T.Vector3 => {
    let xScale = 1.0;
    let zScale = 1.0;
    if (ry > 0.78) {
      xScale = isFemale ? 0.92 : 1.02;
    } else if (ry > 0.6) {
      xScale = isFemale ? 0.86 : 1.04;
      zScale = isFemale ? 0.92 : 1.0;
    } else if (ry > 0.48) {
      xScale = isFemale ? 0.84 : 0.96;
    } else if (ry > 0.36) {
      xScale = isFemale ? 1.08 : 0.94;
      zScale = isFemale ? 1.05 : 0.98;
    } else {
      xScale = isFemale ? 1.04 : 0.98;
    }
    return new T.Vector3(
      center.x + rx * (W * 0.5) * xScale,
      bodyBox.min.y + ry * H,
      center.z + rz * (D * 0.5) * zScale
    );
  };

  const organMat = new T.MeshPhysicalMaterial({
    color: 0x62b886,
    emissive: 0x123824,
    roughness: 0.42,
    metalness: 0.05,
    clearcoat: 0.25,
  });
  const tonsilMat = new T.MeshStandardMaterial({
    color: 0x7fd4a2,
    emissive: 0x164028,
    roughness: 0.48,
  });
  const ductMat = new T.MeshPhysicalMaterial({
    color: 0x8ae8b2,
    emissive: 0x1a4d30,
    roughness: 0.28,
    transparent: true,
    opacity: 0.88,
  });
  const vesselMat = new T.MeshStandardMaterial({
    color: 0x52c484,
    emissive: 0x0f331e,
    roughness: 0.35,
    transparent: true,
    opacity: 0.78,
  });
  const nodeMat = new T.MeshPhysicalMaterial({
    color: 0x73e09e,
    emissive: 0x143d24,
    roughness: 0.36,
    metalness: 0.04,
    clearcoat: 0.3,
  });
  const hitboxMat = new T.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  const metaMap = new Map<string, ExtraAnatMeta>();
  for (const item of LYMPH_SEARCH_INDEX) {
    metaMap.set(item.id, { ...item });
  }
  const metas: ExtraAnatMeta[] = [];
  const hitTargets: T.Object3D[] = [];

  const registerMeta = (
    id: string,
    worldPos: T.Vector3,
    hitRadius: number | [number, number, number]
  ): void => {
    const meta = metaMap.get(id);
    if (!meta) return;
    meta.worldPos = [
      Number(worldPos.x.toFixed(4)),
      Number(worldPos.y.toFixed(4)),
      Number(worldPos.z.toFixed(4)),
    ];
    metas.push(meta);
    const hb = createHitbox(meta, worldPos, hitRadius, hitboxMat);
    group.add(hb);
    hitTargets.push(hb);
  };

  // 1. 淋巴器官实体网格
  const organsRes = buildLymphoidOrgans(
    anchor,
    s,
    isFemale,
    organMat,
    tonsilMat,
    hitboxMat,
    registerMeta
  );
  group.add(organsRes.group);

  // 2. 乳糜池 + 9大干 + 2大导管 + 四肢浅深管网
  const ductsGroup = new T.Group();
  ductsGroup.name = 'lymph_trunks_and_ducts';

  const chyliPos = anchor(-0.02, 0.565, -0.05);
  const chyliMesh = new T.Mesh(
    new T.CapsuleGeometry(0.0085 * s, 0.028 * s, 6, 12),
    ductMat
  );
  chyliMesh.position.copy(chyliPos);
  chyliMesh.userData = { region: 'torso', explodeOffset: new T.Vector3(...REGION_EXPLODE_MAP.torso) };
  ductsGroup.add(chyliMesh);
  registerMeta('lymph_cisterna_chyli', chyliPos, 0.028 * s);

  const trunkSpecs: TrunkSpec[] = [
    {
      id: 'lymph_thoracic_duct',
      region: 'torso',
      isDuct: true,
      radius: 0.0042 * s,
      points: [
        chyliPos.clone(),
        anchor(-0.015, 0.62, -0.06),
        anchor(-0.01, 0.69, -0.055),
        anchor(0.02, 0.75, -0.05),
        anchor(0.055, 0.805, -0.03),
      ],
    },
    {
      id: 'lymph_thoracic_arch',
      region: 'head',
      isDuct: true,
      radius: 0.0038 * s,
      points: [
        anchor(0.055, 0.805, -0.03),
        anchor(0.085, 0.822, -0.01),
        anchor(0.115, 0.808, 0.04),
        anchor(0.118, 0.785, 0.08),
      ],
    },
    {
      id: 'lymph_right_duct',
      region: 'head',
      isDuct: true,
      radius: 0.0036 * s,
      points: [
        anchor(-0.105, 0.805, 0.03),
        anchor(-0.115, 0.792, 0.06),
        anchor(-0.118, 0.785, 0.08),
      ],
    },
    {
      id: 'lymph_lumbar_trunk_l',
      region: 'torso',
      radius: 0.003 * s,
      points: [
        anchor(0.055, 0.45, -0.03),
        anchor(0.042, 0.505, -0.045),
        chyliPos.clone(),
      ],
    },
    {
      id: 'lymph_lumbar_trunk_r',
      region: 'torso',
      radius: 0.003 * s,
      points: [
        anchor(-0.065, 0.45, -0.03),
        anchor(-0.048, 0.505, -0.045),
        chyliPos.clone(),
      ],
    },
    {
      id: 'lymph_intestinal_trunk',
      region: 'torso',
      radius: 0.0032 * s,
      points: [
        anchor(0.01, 0.495, 0.14),
        anchor(0.0, 0.535, 0.06),
        chyliPos.clone(),
      ],
    },
    {
      id: 'lymph_jugular_trunk_l',
      region: 'head',
      radius: 0.0028 * s,
      points: [
        anchor(0.13, 0.88, 0.03),
        anchor(0.125, 0.835, 0.045),
        anchor(0.115, 0.808, 0.04),
      ],
    },
    {
      id: 'lymph_jugular_trunk_r',
      region: 'head',
      radius: 0.0028 * s,
      points: [
        anchor(-0.13, 0.88, 0.03),
        anchor(-0.125, 0.835, 0.045),
        anchor(-0.105, 0.805, 0.03),
      ],
    },
    {
      id: 'lymph_subclavian_trunk_l',
      region: 'arm_l',
      radius: 0.0028 * s,
      points: [
        anchor(0.42, 0.755, 0.02),
        anchor(0.27, 0.782, 0.05),
        anchor(0.118, 0.785, 0.08),
      ],
    },
    {
      id: 'lymph_subclavian_trunk_r',
      region: 'arm_r',
      radius: 0.0028 * s,
      points: [
        anchor(-0.42, 0.755, 0.02),
        anchor(-0.27, 0.782, 0.05),
        anchor(-0.118, 0.785, 0.08),
      ],
    },
    {
      id: 'lymph_bronchomediastinal_l',
      region: 'torso',
      radius: 0.0026 * s,
      points: [
        anchor(0.09, 0.68, 0.02),
        anchor(0.085, 0.74, 0.035),
        anchor(0.115, 0.785, 0.075),
      ],
    },
    {
      id: 'lymph_bronchomediastinal_r',
      region: 'torso',
      radius: 0.0026 * s,
      points: [
        anchor(-0.09, 0.68, 0.02),
        anchor(-0.085, 0.74, 0.035),
        anchor(-0.115, 0.785, 0.075),
      ],
    },
    {
      id: 'lymph_arm_vessels',
      region: 'arm_r',
      radius: 0.002 * s,
      points: [
        anchor(-0.78, 0.48, 0.06),
        anchor(-0.66, 0.59, 0.04),
        anchor(-0.54, 0.69, 0.03),
        anchor(-0.42, 0.755, 0.02),
      ],
    },
    {
      id: 'lymph_leg_vessels',
      region: 'leg_r',
      radius: 0.0022 * s,
      points: [
        anchor(-0.24, 0.06, 0.05),
        anchor(-0.22, 0.21, -0.02),
        anchor(-0.20, 0.34, 0.07),
        anchor(-0.18, 0.415, 0.14),
      ],
    },
  ];

  // Add symmetric left arm & leg superficial/deep vessel paths
  const extraVessels: Array<{ region: AnatRegion; pts: T.Vector3[] }> = [
    {
      region: 'arm_l',
      pts: [
        anchor(0.78, 0.48, 0.06),
        anchor(0.66, 0.59, 0.04),
        anchor(0.54, 0.69, 0.03),
        anchor(0.42, 0.755, 0.02),
      ],
    },
    {
      region: 'leg_l',
      pts: [
        anchor(0.24, 0.06, 0.05),
        anchor(0.22, 0.21, -0.02),
        anchor(0.20, 0.34, 0.07),
        anchor(0.18, 0.415, 0.14),
      ],
    },
  ];

  for (const spec of trunkSpecs) {
    const curve = new T.CatmullRomCurve3(spec.points);
    const mesh = new T.Mesh(
      new T.TubeGeometry(curve, 24, spec.radius, 8, false),
      spec.isDuct ? ductMat : vesselMat
    );
    mesh.name = spec.id;
    mesh.userData = {
      region: spec.region,
      explodeOffset: new T.Vector3(...REGION_EXPLODE_MAP[spec.region]),
    };
    ductsGroup.add(mesh);
    const mid = curve.getPoint(0.5);
    registerMeta(spec.id, mid, 0.032 * s);
  }

  for (const ev of extraVessels) {
    const curve = new T.CatmullRomCurve3(ev.pts);
    const mesh = new T.Mesh(
      new T.TubeGeometry(curve, 20, 0.002 * s, 8, false),
      vesselMat
    );
    mesh.userData = {
      region: ev.region,
      explodeOffset: new T.Vector3(...REGION_EXPLODE_MAP[ev.region]),
    };
    ductsGroup.add(mesh);
  }
  group.add(ductsGroup);

  // 3. InstancedMesh 豆状/肾形淋巴结簇 (覆盖九大区域)
  const clusterSpecs: LymphNodeClusterSpec[] = [
    // 头颈部 (Head & Neck)
    { id: 'lymph_occipital', region: 'head', center: anchor(0, 0.905, -0.34), spread: new T.Vector3(0.04 * s, 0.012 * s, 0.012 * s), count: 6, scale: 0.0052 * s, seed: 101 },
    { id: 'lymph_mastoid', region: 'head', center: anchor(0.26, 0.915, -0.18), spread: new T.Vector3(0.012 * s, 0.016 * s, 0.014 * s), count: 6, scale: 0.005 * s, seed: 102 },
    { id: 'lymph_parotid_sup_deep', region: 'head', center: anchor(0.25, 0.905, 0.05), spread: new T.Vector3(0.014 * s, 0.02 * s, 0.018 * s), count: 10, scale: 0.0054 * s, seed: 103 },
    { id: 'lymph_facial', region: 'head', center: anchor(0.18, 0.895, 0.25), spread: new T.Vector3(0.018 * s, 0.022 * s, 0.012 * s), count: 8, scale: 0.0046 * s, seed: 104 },
    { id: 'lymph_submandibular', region: 'head', center: anchor(0.14, 0.858, 0.18), spread: new T.Vector3(0.022 * s, 0.01 * s, 0.02 * s), count: 10, scale: 0.0062 * s, seed: 105 },
    { id: 'lymph_submental', region: 'head', center: anchor(0, 0.852, 0.27), spread: new T.Vector3(0.016 * s, 0.008 * s, 0.012 * s), count: 5, scale: 0.0052 * s, seed: 106 },
    { id: 'lymph_ant_cervical', region: 'head', center: anchor(0, 0.822, 0.14), spread: new T.Vector3(0.024 * s, 0.026 * s, 0.014 * s), count: 10, scale: 0.0052 * s, seed: 107 },
    { id: 'lymph_lat_cervical_sup', region: 'head', center: anchor(0.16, 0.835, 0.06), spread: new T.Vector3(0.016 * s, 0.028 * s, 0.016 * s), count: 10, scale: 0.0055 * s, seed: 108 },
    { id: 'lymph_lat_cervical_deep_ang', region: 'head', center: anchor(0.13, 0.84, 0.02), spread: new T.Vector3(0.014 * s, 0.032 * s, 0.014 * s), count: 14, scale: 0.0064 * s, seed: 109 },
    { id: 'lymph_virchow', region: 'head', center: anchor(0.145, 0.792, 0.075), spread: new T.Vector3(0.016 * s, 0.01 * s, 0.012 * s), count: 5, scale: 0.0068 * s, seed: 110 },
    { id: 'lymph_retropharyngeal', region: 'head', center: anchor(0, 0.885, -0.05), spread: new T.Vector3(0.022 * s, 0.018 * s, 0.01 * s), count: 6, scale: 0.005 * s, seed: 111 },

    // 上肢与腋窝 5群 + 肘 + 三角胸大肌 (Upper Limb & Axilla)
    { id: 'lymph_axillary_apical', region: 'arm_l', center: anchor(0.41, 0.755, 0.02), spread: new T.Vector3(0.018 * s, 0.016 * s, 0.016 * s), count: 8, scale: 0.0062 * s, seed: 201 },
    { id: 'lymph_axillary_central', region: 'arm_l', center: anchor(0.47, 0.728, 0.01), spread: new T.Vector3(0.02 * s, 0.018 * s, 0.018 * s), count: 10, scale: 0.0065 * s, seed: 202 },
    { id: 'lymph_axillary_lateral', region: 'arm_l', center: anchor(0.54, 0.715, 0.01), spread: new T.Vector3(0.018 * s, 0.02 * s, 0.014 * s), count: 8, scale: 0.0058 * s, seed: 203 },
    { id: 'lymph_axillary_pectoral', region: 'arm_l', center: anchor(0.43, 0.705, 0.14), spread: new T.Vector3(0.02 * s, 0.024 * s, 0.014 * s), count: 10, scale: 0.006 * s, seed: 204 },
    { id: 'lymph_axillary_subscapular', region: 'arm_l', center: anchor(0.44, 0.712, -0.14), spread: new T.Vector3(0.02 * s, 0.024 * s, 0.014 * s), count: 8, scale: 0.0058 * s, seed: 205 },
    { id: 'lymph_cubital', region: 'arm_l', center: anchor(0.63, 0.59, 0.02), spread: new T.Vector3(0.014 * s, 0.018 * s, 0.012 * s), count: 6, scale: 0.005 * s, seed: 206 },
    { id: 'lymph_deltopectoral', region: 'arm_r', center: anchor(-0.44, 0.748, 0.14), spread: new T.Vector3(0.018 * s, 0.016 * s, 0.012 * s), count: 6, scale: 0.0054 * s, seed: 207 },

    // 胸部 (Thorax)
    { id: 'lymph_parasternal', region: 'torso', center: anchor(0.11, 0.69, 0.29), spread: new T.Vector3(0.012 * s, 0.055 * s, 0.01 * s), count: 12, scale: 0.0052 * s, seed: 301 },
    { id: 'lymph_intercostal', region: 'torso', center: anchor(0.18, 0.67, -0.25), spread: new T.Vector3(0.02 * s, 0.06 * s, 0.014 * s), count: 14, scale: 0.0048 * s, seed: 302 },
    { id: 'lymph_sup_diaphragmatic', region: 'torso', center: anchor(0, 0.605, 0.08), spread: new T.Vector3(0.06 * s, 0.014 * s, 0.04 * s), count: 8, scale: 0.0054 * s, seed: 303 },
    { id: 'lymph_mediastinal_ant_post', region: 'torso', center: anchor(0, 0.69, 0.08), spread: new T.Vector3(0.025 * s, 0.045 * s, 0.05 * s), count: 14, scale: 0.0058 * s, seed: 304 },
    { id: 'lymph_pulmonary_broncho', region: 'torso', center: anchor(0.18, 0.695, 0.0), spread: new T.Vector3(0.035 * s, 0.03 * s, 0.025 * s), count: 14, scale: 0.0056 * s, seed: 305 },
    { id: 'lymph_tracheobronchial_para', region: 'torso', center: anchor(0, 0.725, 0.0), spread: new T.Vector3(0.032 * s, 0.035 * s, 0.018 * s), count: 14, scale: 0.006 * s, seed: 306 },

    // 腹部 (Abdomen)
    { id: 'lymph_inf_epigastric', region: 'torso', center: anchor(0.12, 0.455, 0.28), spread: new T.Vector3(0.015 * s, 0.03 * s, 0.01 * s), count: 8, scale: 0.0048 * s, seed: 401 },
    { id: 'lymph_inf_phrenic', region: 'torso', center: anchor(0, 0.585, -0.02), spread: new T.Vector3(0.05 * s, 0.012 * s, 0.03 * s), count: 8, scale: 0.0052 * s, seed: 402 },
    { id: 'lymph_lumbar_abdo', region: 'torso', center: anchor(0, 0.505, -0.05), spread: new T.Vector3(0.038 * s, 0.055 * s, 0.022 * s), count: 22, scale: 0.0062 * s, seed: 403 },
    { id: 'lymph_renal_gonadal', region: 'torso', center: anchor(0.15, 0.525, -0.06), spread: new T.Vector3(0.024 * s, 0.032 * s, 0.018 * s), count: 12, scale: 0.0054 * s, seed: 404 },
    { id: 'lymph_celiac_cascade', region: 'torso', center: anchor(0.02, 0.558, 0.05), spread: new T.Vector3(0.042 * s, 0.022 * s, 0.028 * s), count: 14, scale: 0.0064 * s, seed: 405 },
    { id: 'lymph_sma_3tier', region: 'torso', center: anchor(0.01, 0.505, 0.14), spread: new T.Vector3(0.055 * s, 0.04 * s, 0.045 * s), count: 24, scale: 0.0052 * s, seed: 406 },
    { id: 'lymph_ima_nodes', region: 'torso', center: anchor(0.05, 0.455, 0.09), spread: new T.Vector3(0.032 * s, 0.028 * s, 0.025 * s), count: 12, scale: 0.0052 * s, seed: 407 },

    // 盆部 (Pelvis)
    { id: 'lymph_ext_iliac', region: 'pelvis', center: anchor(0.22, 0.415, 0.08), spread: new T.Vector3(0.02 * s, 0.025 * s, 0.035 * s), count: 14, scale: 0.0058 * s, seed: 501 },
    { id: 'lymph_int_iliac_obt_sac', region: 'pelvis', center: anchor(0.14, 0.395, -0.06), spread: new T.Vector3(0.03 * s, 0.028 * s, 0.03 * s), count: 14, scale: 0.0056 * s, seed: 502 },
    { id: 'lymph_common_iliac', region: 'pelvis', center: anchor(0.12, 0.44, -0.02), spread: new T.Vector3(0.022 * s, 0.022 * s, 0.02 * s), count: 10, scale: 0.006 * s, seed: 503 },

    // 下肢 (Lower Limb)
    { id: 'lymph_popliteal', region: 'leg_l', center: anchor(0.22, 0.215, -0.06), spread: new T.Vector3(0.018 * s, 0.022 * s, 0.014 * s), count: 8, scale: 0.0054 * s, seed: 601 },
    { id: 'lymph_inguinal_sup_t', region: 'leg_l', center: anchor(0.21, 0.395, 0.17), spread: new T.Vector3(0.045 * s, 0.038 * s, 0.015 * s), count: 18, scale: 0.0064 * s, seed: 602 },
    { id: 'lymph_inguinal_deep_cloquet', region: 'leg_r', center: anchor(-0.18, 0.392, 0.12), spread: new T.Vector3(0.015 * s, 0.025 * s, 0.015 * s), count: 8, scale: 0.006 * s, seed: 603 },
  ];

  // Calculate total instances (symmetric bilateral nodes for paired clusters)
  const bilateralIds = new Set<string>([
    'lymph_mastoid',
    'lymph_parotid_sup_deep',
    'lymph_facial',
    'lymph_submandibular',
    'lymph_lat_cervical_sup',
    'lymph_lat_cervical_deep_ang',
    'lymph_parasternal',
    'lymph_intercostal',
    'lymph_pulmonary_broncho',
    'lymph_inf_epigastric',
    'lymph_renal_gonadal',
    'lymph_ext_iliac',
    'lymph_int_iliac_obt_sac',
    'lymph_common_iliac',
    'lymph_popliteal',
    'lymph_inguinal_sup_t',
    'lymph_inguinal_deep_cloquet',
    'lymph_axillary_apical',
    'lymph_axillary_central',
    'lymph_axillary_lateral',
    'lymph_axillary_pectoral',
    'lymph_axillary_subscapular',
    'lymph_cubital',
    'lymph_deltopectoral',
  ]);

  let totalInstances = 0;
  for (const spec of clusterSpecs) {
    totalInstances += bilateralIds.has(spec.id) ? spec.count * 2 : spec.count;
  }

  const beanGeo = createBeanNodeGeometry();
  const instancedNodes = new T.InstancedMesh(beanGeo, nodeMat, totalInstances);
  instancedNodes.name = 'lymph_nodes_instanced';
  const dummy = new T.Object3D();
  let instanceIdx = 0;

  for (const spec of clusterSpecs) {
    const rng = mulberry32(spec.seed);
    const sides = bilateralIds.has(spec.id) ? [1, -1] : [1];
    for (const side of sides) {
      for (let i = 0; i < spec.count; i++) {
        const dx = (rng() - 0.5) * 2 * spec.spread.x;
        const dy = (rng() - 0.5) * 2 * spec.spread.y;
        const dz = (rng() - 0.5) * 2 * spec.spread.z;
        const baseX = side === 1 ? spec.center.x : center.x - (spec.center.x - center.x);
        dummy.position.set(baseX + dx, spec.center.y + dy, spec.center.z + dz);
        dummy.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
        const sc = spec.scale * (0.78 + rng() * 0.48);
        dummy.scale.setScalar(sc);
        dummy.updateMatrix();
        instancedNodes.setMatrixAt(instanceIdx++, dummy.matrix);
      }
    }
    registerMeta(spec.id, spec.center, [
      Math.max(spec.spread.x, 0.025 * s),
      Math.max(spec.spread.y, 0.025 * s),
      Math.max(spec.spread.z, 0.025 * s),
    ]);
  }
  instancedNodes.instanceMatrix.needsUpdate = true;
  group.add(instancedNodes);

  return { group, metas, hitTargets };
}
