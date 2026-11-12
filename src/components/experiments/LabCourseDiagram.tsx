import type { Course } from "@/lib/courses";

function Sorting() {
  const bars = [23, 42, 57, 75, 89, 107];
  const colors = ["#e0b891", "#d7ad84", "#d2a681", "#d3a078", "#dc8f54", "#ba683f"];

  return (
    <svg className="lab-diagram" viewBox="0 0 410 145" aria-hidden="true">
      <defs>
        <pattern id="lab-bar-grain" width="120" height="108" patternUnits="userSpaceOnUse">
          <image href="/lab/paper-pulp.jpg" width="120" height="108" preserveAspectRatio="xMidYMid slice" opacity=".34" />
        </pattern>
      </defs>
      {bars.map((height, index) => (
        <g className="lab-sort-bar" key={height}>
          <rect x={28 + index * 58} y={112 - height} width="43" height={height} rx="1.5" fill={colors[index]} stroke="#f4d0ae" strokeWidth="1.25" />
          <rect x={29 + index * 58} y={113 - height} width="41" height={height - 1} fill="url(#lab-bar-grain)" />
        </g>
      ))}
      <path d="M5 112H394 M114 108v8m76-8v8m64-8v8m62-8v8m52-8v8" stroke="#f6ddc4" strokeWidth="1.1" />
      <g fill="#fff0d9" fontSize="18" textAnchor="middle">
        {[28, 43, 52, 65, 94].map((value, index) => <text key={value} x={[114, 190, 254, 316, 368][index]} y="136">{value}</text>)}
      </g>
    </svg>
  );
}

function Scheduling() {
  const stages = ["#b7775c", "#9d9890", "#a08553"];
  const slices = ["#b7b5a4", "#9f9b8a", "#ddc293", "#efd4a2", "#e4ad79", "#d79b69", "#bd784c", "#826b55"];

  return (
    <svg className="lab-diagram" viewBox="0 0 255 108" aria-hidden="true">
      <defs>
        <linearGradient id="lab-time-light" x2="0" y2="1">
          <stop stopColor="#fff1d6" stopOpacity=".22" />
          <stop offset="1" stopColor="#1a1612" stopOpacity=".21" />
        </linearGradient>
      </defs>
      <g fontSize="14" fill="#fff3de" textAnchor="middle">
        {stages.map((fill, index) => (
          <g key={fill} className="lab-time-process">
            <rect x={12 + index * 59} y="4" width="53" height="23" rx="2" fill={fill} />
            <rect x={12 + index * 59} y="4" width="53" height="23" rx="2" fill="url(#lab-time-light)" />
            <text x={38.5 + index * 59} y="20">P{index + 1}</text>
          </g>
        ))}
      </g>
      <g strokeWidth=".5" stroke="#f4d6af63">
        {slices.map((fill, index) => <rect key={fill} x={12 + index * 28.5} y="40" width="28.5" height="23" fill={fill} />)}
        <rect x="12" y="40" width="228" height="23" rx="3" fill="url(#lab-time-light)" />
      </g>
      <path d="M4 81H248 M12 75v11m28-9v8m29-10v11m28-9v8m29-10v11m28-9v8m29-10v11m28-9v8m29-10v11" fill="none" stroke="#eadcc8" />
      <g fill="#fff3de" fontSize="15" textAnchor="middle">
        {[0, 4, 8, 12, 16].map((value, index) => <text key={value} x={12 + index * 57} y="104">{value}</text>)}
      </g>
    </svg>
  );
}

export function LabChip() {
  return (
    <svg className="lab-chip" viewBox="0 0 335 225" aria-hidden="true">
      <defs>
        <linearGradient id="lab-chip-case" x2="1" y2="1">
          <stop stopColor="#615449" />
          <stop offset=".62" stopColor="#352f29" />
          <stop offset="1" stopColor="#211e1b" />
        </linearGradient>
        <linearGradient id="lab-chip-metal" x2="0" y2="1">
          <stop stopColor="#f7dfb3" />
          <stop offset=".53" stopColor="#886344" />
          <stop offset="1" stopColor="#3c2b22" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="#bc8554" strokeWidth=".85" opacity=".76">
        <path d="M131 88L101 49H64L48 34H22 M128 98L97 61H46L35 48H8 M120 106L88 75H60L36 59H2 M118 115L79 88H51L32 73H13 M116 122L72 105H39L22 92H6 M115 131L75 123H39L24 108H4 M115 141L83 143H49L34 129H20 M111 152L69 169H51L32 150H1 M121 156L89 180H66L55 192H32 M134 159L109 191H91L77 208H53 M146 161L131 201H110L99 218 M157 167L153 207L141 222 M169 169L179 203L173 220 M181 172L204 201L209 218 M194 172L231 204L246 208 M211 170L251 196L279 201 M229 166L278 184L307 183 M238 159L284 166L330 162 M246 150L291 147L316 138H335 M248 138L298 127L329 109 M245 127L290 111L329 85 M240 116L277 93L313 57 M232 105L255 78L296 37 M222 98L242 61L274 18 M212 91L227 50L255 8 M201 88L211 39L229 8 M188 82L196 27L207 1 M173 83L177 22L181 0 M160 80L159 24L145 0 M148 84L143 45L119 22" />
        {[[22,34],[8,48],[2,59],[13,73],[6,92],[4,108],[20,129],[1,150],[32,192],[53,208],[99,218],[141,222],[209,218],[279,201],[307,183],[330,162],[329,109],[313,57],[296,37],[274,18],[229,8],[207,1],[145,0],[119,22]].map(([cx,cy]) => <circle key={`${cx},${cy}`} cx={cx} cy={cy} r="1.8" fill="#d09a65" />)}
      </g>
      <g className="lab-chip-case">
        <path d="M166 49L275 87Q284 91 280 102L231 177Q225 188 214 186L103 149Q91 145 95 132L149 55Q155 46 166 49Z" fill="#15110f" stroke="#090806" strokeWidth="8" />
        <path d="M162 43L273 82Q283 86 278 98L228 174Q222 182 213 180L102 142Q92 138 97 128L147 49Q152 41 162 43Z" fill="url(#lab-chip-metal)" stroke="#8f6b47" strokeWidth="2" />
        <path d="M161 36L273 74Q282 77 277 87L225 164Q220 172 212 169L101 131Q92 128 97 119L147 42Q153 33 161 36Z" fill="url(#lab-chip-case)" stroke="#e1c7a0" strokeWidth="1.8" />
        <path d="M161 50L259 83Q263 84 260 90L219 150Q215 155 211 153L116 121Q110 119 114 114L153 55Q156 48 161 50Z" fill="none" stroke="#e9cfaa" strokeWidth="2.3" />
        <text x="184" y="112" fill="#e8ca9b" fontSize="30" fontWeight="600" textAnchor="middle" transform="rotate(18 184 112)">CPU</text>
      </g>
    </svg>
  );
}

const routers = [[206, 65], [333, 121], [476, 59], [622, 117], [706, 52]];
const routerRoute = "M0 124C76 111 147 76 206 65C257 55 290 117 333 121C401 128 430 61 476 59C537 54 577 115 622 117C662 118 686 67 706 52C755 17 824 110 893 112";
const latitudes = "M4 112Q149 63 316 102M1 150Q163 97 330 140M2 186Q174 140 334 181M16 226Q181 183 332 221M33 263Q181 230 316 263M55 73Q169 32 287 69M98 35Q174 13 244 38";
const meridians = "M154 7C61 36 20 173 78 274M154 7C85 69 68 193 110 286M154 7C125 77 115 210 142 297M154 7C170 73 179 205 180 303M154 7C212 59 237 187 217 295M154 7C266 57 287 171 251 283M154 7C305 55 335 176 285 266";
const continents = "M9 135l13-15 8-17 10-2 7-13 10-1 13-16 15 3 13-14 16-3 13 6-6 10 11 3 12-8 7 7-10 11-18 4-5 15-16 1-6 13-10 1-3 15-8 4-3 21-11 5 7 14-7 5-13-12-7-21-11-1-4-20-17-6ZM80 170l18 7 7 12 19 2 9 14 18 8-4 10-15 11-5 23-15 13-4 21-8-5-2-33-10-18-1-14-11-11 2-12-6-15ZM116 48l19-12 20 1 13 12-6 10-14 12-13-4 2-9-19 1ZM166 95l7-13 8 2 6-12 8 7 12-14 25-7 13 5 17-8 25 12 7 17 24 9 2 22-11 2-14-10-10 10 7 11-13 3-15-13-9 9 9 16-10 10-13-6-7-15-12 4 3 20-13 5-10-20-12-7-13 2-4-13-13 7-6-7 7-12 14-5-12-9ZM172 129l-16 10-8 17 6 18 15 3 13-3 6 20 10 24 10-5 12-19 3-20 13-12-13-5-12-13-21-8ZM273 207l18-10 20 4 11 14-10 18-20 1-11 10-13-5 1-16-11-4Z";

export function LabNetwork() {
  return (
    <div className="lab-network-scene" aria-hidden="true">
      <svg className="lab-router-diagram" viewBox="0 0 925 160">
        <defs>
          <linearGradient id="lab-router-side">
            <stop stopColor="#8c7d68" />
            <stop offset=".52" stopColor="#706150" />
            <stop offset="1" stopColor="#483b30" />
          </linearGradient>
          <linearGradient id="lab-router-top" x2="0" y2="1">
            <stop stopColor="#a99b84" />
            <stop offset="1" stopColor="#776957" />
          </linearGradient>
        </defs>
        <path d={routerRoute} fill="none" stroke="#dfc7a2" strokeWidth="2" />
        <path className="lab-packet-trail" d={routerRoute} fill="none" stroke="#f7e0b7" strokeWidth="3" pathLength="100" />
        <path d="M206 65C303 44 337 96 390 95C423 92 439 63 476 59C575 47 619 38 706 52" fill="none" stroke="#d9bf9b" strokeWidth="1.5" />
        {routers.map(([x,y]) => (
          <g key={x} className="lab-router" transform={`translate(${x} ${y})`}>
            <path d="M-36-1V9C-34 31 34 31 36 9V-1Z" fill="url(#lab-router-side)" />
            <ellipse rx="36" ry="13" fill="url(#lab-router-top)" stroke="#d6c1a5" strokeWidth="1.45" />
            <path d="M-19-7L-3-1M3 1l16 7M-18 8L-3 1M3-1l17-7m-34 0-5 1 1 3m36 7 1 5-7 1m-30-4 0 3 6 1m25-16 7-1-1 4" fill="none" stroke="#ffefd5" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ))}
      </svg>
      <svg className="lab-globe" viewBox="0 0 335 320">
        <defs>
          <clipPath id="lab-globe-edge"><circle cx="168" cy="166" r="163" /></clipPath>
          <radialGradient id="lab-globe-ocean" cx=".31" cy=".27" r=".76">
            <stop stopColor="#514a40" />
            <stop offset="1" stopColor="#22211f" />
          </radialGradient>
          <pattern id="lab-globe-print" width="3" height="3" patternUnits="userSpaceOnUse">
            <circle cx="1.3" cy="1.3" r=".94" fill="#d8bfa0" />
          </pattern>
        </defs>
        <circle cx="168" cy="166" r="163" fill="url(#lab-globe-ocean)" stroke="#a99c88" strokeWidth="2" />
        <g clipPath="url(#lab-globe-edge)" transform="rotate(-17 168 166)">
          <path d={continents} fill="url(#lab-globe-print)" />
          <path d={latitudes + meridians} fill="none" stroke="#b4a088" strokeWidth=".75" opacity=".67" />
        </g>
      </svg>
      <div className="lab-network-readout">
        <strong>数据包传输</strong>
        <span>延迟：24 ms</span>
        <span>丢包率：0%</span>
        <span>路径：A → F → E</span>
      </div>
    </div>
  );
}

function Programming() {
  const code = ["int main() {", "   int a = 10;", "   int *p = &a;", "   *p = 20;", "   return 0;", "}"];
  return (
    <svg className="lab-diagram" viewBox="0 0 374 203" aria-hidden="true">
      <g transform="translate(6 6) rotate(-6 98 92)" className="lab-code-panel">
        <rect x="2" y="1" width="189" height="178" rx="2" fill="#332f28" />
        <rect x="2" y="83" width="189" height="28" fill="#a9653f" />
        {code.map((line, index) => (
          <text key={line} x="13" y={24 + index * 26} fontSize="15" fontFamily="Consolas, monospace" fill="#ffefda" xmlSpace="preserve">{index + 1}  {line}</text>
        ))}
      </g>
      <g transform="translate(218 16)" stroke="#75593f">
        <text x="4" y="24" fill="#281b13" stroke="none" fontSize="23" fontWeight="800">内存</text>
        <rect x="3" y="41" width="140" height="35" fill="#f2dfc4" />
        <rect x="3" y="87" width="140" height="35" fill="#efd8b7" />
        <path d="M49 41v35M49 87v35" />
        <rect className="lab-memory-value" x="50" y="87" width="93" height="35" fill="#c7773d" />
        <g textAnchor="middle" fontSize="19" fill="#292018" stroke="none">
          <text x="26" y="64">p</text><text x="96" y="64">0x7ffc…</text>
          <text x="26" y="111">a</text><text x="96" y="111" fill="#fff0d9">20</text>
        </g>
      </g>
    </svg>
  );
}

function IndexTree() {
  return (
    <svg className="lab-diagram" viewBox="0 0 302 203" aria-hidden="true">
      <g fill="#211913" fontSize="21" fontWeight="800"><text x="205" y="25">B+ 树</text></g>
      <path d="M149 57L75 91M149 57v34m0-34 77 34M75 121L28 153m47-32v32m74-32-28 32m28-32 29 32m48-32v32m0-32 52 32" stroke="#533d2c" strokeWidth="1.8" fill="none" />
      <g className="lab-tree-nodes" stroke="#62442d" strokeWidth="1.5" fill="#f2d7b0">
        <rect x="102" y="31" width="94" height="31" rx="1.5" />
        <path d="M149 31v31" />
        {[75, 149, 226].map((x) => <rect key={x} x={x - 24} y="91" width="48" height="32" rx="1.5" />)}
        {[8, 12, 24, 36, 48, 60].map((value, index) => <rect key={value} x={5 + index * 49} y="154" width="49" height="34" fill={value === 24 ? "#c47842" : undefined} />)}
      </g>
      <g textAnchor="middle" fontSize="17" fill="#241911" fontWeight="650">
        <text x="125" y="53">24</text><text x="173" y="53">48</text>
        <text x="75" y="113">12</text><text x="149" y="113">36</text><text x="226" y="113">60</text>
        {[8, 12, 24, 36, 48, 60].map((value, index) => <text key={value} x={29.5 + index * 49} y="177" fill={value === 24 ? "#fff1db" : undefined}>{value}</text>)}
      </g>
    </svg>
  );
}

const orangePoints = [[40,94],[49,111],[55,70],[58,90],[68,107],[73,67],[76,84],[84,47],[84,101],[89,70],[92,29],[94,86],[101,110],[105,57],[112,18],[114,72],[119,44],[122,92],[126,61]];
const inkPoints = [[108,136],[118,147],[126,126],[133,154],[139,117],[143,139],[151,124],[155,146],[161,107],[164,132],[170,153],[173,118],[179,96],[182,136],[188,110],[193,150],[197,122],[202,100],[207,142],[212,115],[219,132]];

function Clustering() {
  return (
    <svg className="lab-diagram" viewBox="0 0 235 195" aria-hidden="true">
      <path d="M24 6L12 172L224 175 M12 171C63 165 101 138 133 93C158 58 182 33 223 27" fill="none" stroke="#2c261e" strokeWidth="1.7" />
      <path d="M16 30h12M13 65h12M11 101h12M8 136h12M6 171h12m24-4v11m34-10v11m34-10v11m34-10v11m34-10v11m34-10v11" stroke="#65513c" strokeWidth=".65" fill="none" />
      {orangePoints.map(([x,y], index) => <circle key={`${x},${y}`} cx={x} cy={y} r={3.5 + index % 4 * .65} fill={["#a96138", "#c98249", "#d3995b"][index % 3]} />)}
      {inkPoints.map(([x,y], index) => <circle key={`${x},${y}`} cx={x} cy={y} r={4.1 + index % 4 * .65} fill={["#514c36", "#625a42", "#777053"][index % 3]} />)}
    </svg>
  );
}

const diagrams = {
  algorithms: Sorting,
  "operating-systems": Scheduling,
  networks: LabNetwork,
  programming: Programming,
  databases: IndexTree,
  ai: Clustering,
};

export function LabCourseDiagram({ course }: { course: Course }) {
  const Diagram = diagrams[course.slug];
  return (
    <div className="lab-course-figure" role="img" aria-label={course.preview}>
      <Diagram />
      {course.slug === "operating-systems" && <LabChip />}
    </div>
  );
}
