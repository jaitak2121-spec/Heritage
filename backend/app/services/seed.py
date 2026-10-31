import logging
from sqlalchemy.orm import Session
from app.models.heritage_site import HeritageSite
from app.models.archival_document import ArchivalDocument
from app.models.site_image import SiteImage

logger = logging.getLogger(__name__)

SEED_SITES = [
    {
        "name": "Taj Mahal",
        "historical_period": "Mughal Era",
        "architectural_style": "Indo-Islamic",
        "region": "North",
        "location_name": "Agra, Uttar Pradesh",
        "latitude": 27.1751,
        "longitude": 78.0421,
        "image_url": "https://images.unsplash.com/photo-1564507592333-c60657eea523?q=80&w=800&auto=format&fit=crop",
        "description": "White marble mausoleum commissioned in 1632 by Mughal Emperor Shah Jahan to house the tomb of his favourite wife, Mumtaz Mahal. Stands on the southern bank of the Yamuna River, incorporating formal charbagh gardens, a red sandstone mosque, and an identical guest pavilion.",
        "significance": "Designated a UNESCO World Heritage Site in 1983 as universally admired masterpiece of world heritage. Exemplifies Mughal architectural symmetry, parchin kari pietra dura stone inlays, and calligraphy.",
        "sources": "UNESCO World Heritage Centre (Ref: 252); Archaeological Survey of India (ASI) Agra Circle; Ebba Koch, 'The Complete Taj Mahal', Thames & Hudson, 2006.",
        "documents": [
            {
                "title": "Architectural Survey of the Agra Taj Complex",
                "file_type": "PDF",
                "original_filename": "asi_agra_taj_survey_1942.pdf",
                "extracted_text": "Ground plan analysis demonstrates strict axial symmetry. Foundation utilizes timber-and-brick deep wells sunk along the Yamuna flood plain to absorb seasonal hydrostatic movement.",
            },
            {
                "title": "Parchin Kari Inscription Record",
                "file_type": "PDF",
                "original_filename": "pietra_dura_inscriptions.pdf",
                "extracted_text": "Calligraphic bands executed by Amanat Khan in Thuluth script using black marble inlaid into white Makrana stone.",
            }
        ],
        "images": [
            {"image_url": "https://images.unsplash.com/photo-1592066575191-f7d280d6fa1f?q=80&w=800", "caption": "South gateway facade and reflecting pool"},
            {"image_url": "https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=800", "caption": "Detail of exterior marble lattice screens (jali)"},
        ]
    },
    {
        "name": "Red Fort",
        "historical_period": "Mughal Era",
        "architectural_style": "Indo-Islamic",
        "region": "North",
        "location_name": "Old Delhi, Delhi",
        "latitude": 28.6562,
        "longitude": 77.2410,
        "image_url": "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?q=80&w=800&auto=format&fit=crop",
        "description": "Historic fortified palace commissioned by Shah Jahan in 1638 when moving the Mughal capital from Agra to Shahjahanabad. Constructed from red sandstone with defensive octagonal bastions and ceremonial pavilions.",
        "significance": "UNESCO World Heritage Site since 2007. Represents the zenith of Mughal palatial architecture, combining Persian garden traditions with indigenous Indian craftsmanship.",
        "sources": "UNESCO World Heritage Centre (Ref: 1054); ASI Delhi Circle Records; Gordon Sanderson, 'Delhi Fort: A Guide to the Buildings and Gardens', 1914.",
        "documents": [
            {
                "title": "Shahjahanabad Urban Survey & Fort Plan",
                "file_type": "PDF",
                "original_filename": "delhi_fort_sanderson_1914.pdf",
                "extracted_text": "The fortress sits along the former Yamuna channel with Diwan-i-Aam (Hall of Public Audience) and Diwan-i-Khas linked by the canal Nahr-i-Bihisht.",
            }
        ],
        "images": [
            {"image_url": "https://images.unsplash.com/photo-1587474260584-136574528ed5?q=80&w=800", "caption": "Lahori Gate entrance bastion"},
        ]
    },
    {
        "name": "Qutub Minar Complex",
        "historical_period": "Medieval",
        "architectural_style": "Indo-Islamic",
        "region": "North",
        "location_name": "Mehrauli, New Delhi",
        "latitude": 28.5245,
        "longitude": 77.1855,
        "image_url": "https://images.unsplash.com/photo-1528190336453-5c4e238b3e1a?q=80&w=800&auto=format&fit=crop",
        "description": "72.5-meter fluted red sandstone victory minaret commissioned by Qutb-ud-din Aibak and expanded by Iltutmish and Firuz Shah Tughlaq. Surrounds Quwwat-ul-Islam Mosque and the 4th-century Gupta iron pillar.",
        "significance": "UNESCO World Heritage Site since 1993. Masterpiece of early Delhi Sultanate epigraphy and corbelled balcony engineering.",
        "sources": "UNESCO World Heritage Centre (Ref: 233); J.A. Page, 'An Historical Memoir on the Qutb: Delhi', Memoirs of the Archaeological Survey of India, 1926.",
        "documents": [
            {
                "title": "Epigraphical Memoir on the Qutb Minaret",
                "file_type": "PDF",
                "original_filename": "page_qutb_memoir_1926.pdf",
                "extracted_text": "Five distinct storeys marked by projecting balconies supported by clustered brackets with cursive Naskh calligraphic relief inscriptions.",
            }
        ],
        "images": [
            {"image_url": "https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=800", "caption": "Alai Darwaza gateway and iron pillar complex"},
        ]
    },
    {
        "name": "Hampi Ruins",
        "historical_period": "Medieval",
        "architectural_style": "Dravidian",
        "region": "South",
        "location_name": "Ballari, Karnataka",
        "latitude": 15.3350,
        "longitude": 76.4600,
        "image_url": "https://images.unsplash.com/photo-1593693399746-69c2665ca300?q=80&w=800&auto=format&fit=crop",
        "description": "Sprawling capital ruins of the Vijayanagara Empire situated on the banks of the Tungabhadra River amidst rugged granite boulder hills. Features the monolithic Virupaksha Temple, stone chariot pavilion, and royal elephant stables.",
        "significance": "UNESCO World Heritage Site since 1986. Preserves advanced medieval hydraulic canal systems, bazaar avenues, and Vijayanagara dynastic temple art.",
        "sources": "UNESCO World Heritage Centre (Ref: 241); ASI Hampi Circle; George Michell, 'Architecture and Art of Southern India: Vijayanagara', Cambridge University Press.",
        "documents": [
            {
                "title": "Vijayanagara Urban Architectural Survey",
                "file_type": "PDF",
                "original_filename": "hampi_urban_survey.pdf",
                "extracted_text": "Granite masonry techniques utilized precision dry-stone joints with interlocking clamps without lime mortar in defensive battlements.",
            }
        ],
        "images": [
            {"image_url": "https://images.unsplash.com/photo-1600100397608-f010e4215f72?q=80&w=800", "caption": "Stone Chariot at the Vittala Temple courtyard"},
        ]
    },
    {
        "name": "Brihadisvara Temple",
        "historical_period": "Medieval",
        "architectural_style": "Dravidian",
        "region": "South",
        "location_name": "Thanjavur, Tamil Nadu",
        "latitude": 10.7828,
        "longitude": 79.1318,
        "image_url": "https://images.unsplash.com/photo-1609766418204-94aae0ecfddc?q=80&w=800&auto=format&fit=crop",
        "description": "Colossal granite Shiva temple commissioned by Chola Emperor Rajaraja I in 1010 CE. Features a 66-meter vimana tower crowned by an 80-tonne monolithic granite cupola and extensive Tamil inscriptions.",
        "significance": "UNESCO World Heritage Site (Great Living Chola Temples). Regarded as the apex of South Indian Dravidian stone temple construction and bronze casting history.",
        "sources": "UNESCO World Heritage Centre (Ref: 250bis); Epigraphia Indica Vol. 2; K.A. Nilakanta Sastri, 'The Cholas', University of Madras, 1935.",
        "documents": [
            {
                "title": "Thanjavur Epigraphical Corpus & Chola Donations",
                "file_type": "PDF",
                "original_filename": "epigraphia_indica_thanjavur.pdf",
                "extracted_text": "Inscriptions on the temple basement detail temple endowments, bronze foundry gifts, and judicial administrative frameworks of the Chola empire.",
            }
        ],
        "images": [
            {"image_url": "https://images.unsplash.com/photo-1621645811776-80415d8628fc?q=80&w=800", "caption": "Vimana tower rising above the sanctum sanctorum"},
        ]
    },
    {
        "name": "Konark Sun Temple",
        "historical_period": "Medieval",
        "architectural_style": "Kalinga",
        "region": "East",
        "location_name": "Puri, Odisha",
        "latitude": 19.8876,
        "longitude": 86.0945,
        "image_url": "https://images.unsplash.com/photo-1575719315416-8a6d3a4f0c56?q=80&w=800&auto=format&fit=crop",
        "description": "13th-century Surya sanctuary built by King Narasimhadeva I of the Eastern Ganga Dynasty. Designed as a colossal stone chariot of the Sun God pulled by seven horses, featuring 24 intricately carved wheels that function as sundials.",
        "significance": "UNESCO World Heritage Site since 1984. Celebrated for monumental scale, masterly Kalinga masonry, and high-relief relief carvings depicting musicians, dancers, and epics.",
        "sources": "UNESCO World Heritage Centre (Ref: 246); Archaeological Survey of India Bhubaneswar Circle; K.S. Behera, 'Konark: The Heritage of Mankind', 1996.",
        "documents": [
            {
                "title": "Astronomical & Mechanical Analysis of Konark Wheels",
                "file_type": "PDF",
                "original_filename": "konark_sundial_survey.pdf",
                "extracted_text": "Each 9.7-foot wheel features eight wide spokes and eight thin spokes; shadow analysis confirms accurate division of solar day into praharas.",
            }
        ],
        "images": [
            {"image_url": "https://images.unsplash.com/photo-1631650034143-fc1808b354cf?q=80&w=800", "caption": "Detail of carved Konark stone chariot wheel"},
        ]
    },
    {
        "name": "Ajanta Caves",
        "historical_period": "Ancient",
        "architectural_style": "Rock-Cut",
        "region": "West",
        "location_name": "Chhatrapati Sambhajinagar, Maharashtra",
        "latitude": 20.5527,
        "longitude": 75.7004,
        "image_url": "https://images.unsplash.com/photo-1578662996442-48f60103fc96?q=80&w=800&auto=format&fit=crop",
        "description": "30 rock-cut Buddhist cave monuments excavated into a horseshoe-shaped volcanic cliff gorge along the Waghur River. Comprises chaitya prayer halls and vihara monasteries dating from the Satavahana and Vakataka eras.",
        "significance": "UNESCO World Heritage Site since 1983. House the finest surviving masterworks of classical Indian tempera wall murals illustrating Jataka tales and Bodhisattva figures.",
        "sources": "UNESCO World Heritage Centre (Ref: 242); ASI Archaeological Survey Reports; Walter M. Spink, 'Ajanta: History and Development', Brill, 2005.",
        "documents": [
            {
                "title": "Ajanta Mural Pigment & Stratigraphy Report",
                "file_type": "PDF",
                "original_filename": "ajanta_pigment_analysis.pdf",
                "extracted_text": "Pigments sourced locally from volcanic basalt, red ochre, green glauconite, and imported Persian lapis lazuli on lime-mud ground.",
            }
        ],
        "images": [
            {"image_url": "https://images.unsplash.com/photo-1600100397608-f010e4215f72?q=80&w=800", "caption": "Horseshoe gorge overview of cave facades"},
        ]
    },
    {
        "name": "Ellora Caves",
        "historical_period": "Medieval",
        "architectural_style": "Rock-Cut",
        "region": "West",
        "location_name": "Verul, Maharashtra",
        "latitude": 20.0264,
        "longitude": 75.1792,
        "image_url": "https://images.unsplash.com/photo-1588666309990-d68f08e3d4c6?q=80&w=800&auto=format&fit=crop",
        "description": "34 rock-cut monastery-temple caves carved side-by-side out of the Charanandri hills spanning Buddhist, Hindu, and Jain traditions. Centered upon Cave 16, the monolithic multi-level Kailash Temple.",
        "significance": "UNESCO World Heritage Site since 1983. The Kailash Temple represents the world's largest top-down monolithic rock excavation, removing over 200,000 tonnes of basalt rock under Rashtrakuta patronage.",
        "sources": "UNESCO World Heritage Centre (Ref: 243); ASI Western Circle; James Burgess, 'Report on the Elura Cave Temples', 1883.",
        "documents": [
            {
                "title": "Kailash Cave Top-Down Excavation Study",
                "file_type": "PDF",
                "original_filename": "ellora_kailash_monograph.pdf",
                "extracted_text": "Carved from vertical cliff face downward using iron chisels; no scaffolding was required for initial exterior relief profiles.",
            }
        ],
        "images": [
            {"image_url": "https://images.unsplash.com/photo-1600100397608-f010e4215f72?q=80&w=800", "caption": "Kailash Temple monolithic courtyard"},
        ]
    },
    {
        "name": "Khajuraho Group of Monuments",
        "historical_period": "Medieval",
        "architectural_style": "Nagara",
        "region": "Central",
        "location_name": "Chhatarpur, Madhya Pradesh",
        "latitude": 24.8511,
        "longitude": 79.9245,
        "image_url": "https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=800&auto=format&fit=crop",
        "description": "Group of Hindu and Jain temples built between 950 and 1050 CE under the Chandela Dynasty. Famed for soaring sikhara spires and exterior friezes depicting divine and worldly life, culminating in the Kandariya Mahadeva Temple.",
        "significance": "UNESCO World Heritage Site since 1986. Supreme embodiment of northern Indian Nagara architectural style and stone sculpture integration.",
        "sources": "UNESCO World Heritage Centre (Ref: 240); ASI Bhopal Circle; Krishna Deva, 'Temples of Khajuraho', Archaeological Survey of India, 1990.",
        "documents": [
            {
                "title": "Kandariya Mahadeva Architectural Survey",
                "file_type": "PDF",
                "original_filename": "khajuraho_krishna_deva.pdf",
                "extracted_text": "Temple plan incorporates ardhamandapa, mandapa, mahamandapa, antarala, and garbhagriha on a unified elevated adhisthana plinth.",
            }
        ],
        "images": [
            {"image_url": "https://images.unsplash.com/photo-1600100397608-f010e4215f72?q=80&w=800", "caption": "Kandariya Mahadeva Temple sikhara spire"},
        ]
    },
    {
        "name": "Great Stupa at Sanchi",
        "historical_period": "Ancient",
        "architectural_style": "Rock-Cut",
        "region": "Central",
        "location_name": "Raisen, Madhya Pradesh",
        "latitude": 23.4795,
        "longitude": 77.7397,
        "image_url": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?q=80&w=800&auto=format&fit=crop",
        "description": "One of the oldest stone structures in India, commissioned by Mauryan Emperor Ashoka in the 3rd century BCE. Features a hemispherical stone dome sheltering relics of the Buddha, encircled by four ceremonial torana gateways.",
        "significance": "UNESCO World Heritage Site since 1989. The torana relief carvings provide the foremost visual encyclopedia of early Indian Buddhist narrative art and Mauryan epigraphy.",
        "sources": "UNESCO World Heritage Centre (Ref: 524); ASI Sanchi Records; Sir John Marshall, 'The Monuments of Sanchi', 1940.",
        "documents": [
            {
                "title": "Marshall's Sanchi Monograph & Inscriptions",
                "file_type": "PDF",
                "original_filename": "marshall_sanchi_1940.pdf",
                "extracted_text": "Torana architrave reliefs depict Jataka stories and donor inscriptions from guilds of ivory carvers from ancient Vidisha.",
            }
        ],
        "images": [
            {"image_url": "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?q=80&w=800", "caption": "North Torana gateway carvings"},
        ]
    },
    {
        "name": "Rani ki Vav",
        "historical_period": "Medieval",
        "architectural_style": "Kalinga",
        "region": "West",
        "location_name": "Patan, Gujarat",
        "latitude": 23.8589,
        "longitude": 72.1017,
        "image_url": "https://images.unsplash.com/photo-1609137144813-7d9921338f24?q=80&w=800&auto=format&fit=crop",
        "description": "Intricate subterranean stepwell on the banks of the Saraswati River built as a memorial by Queen Udayamati in the 11th century CE. Designed as an inverted temple highlighting the sanctity of water across seven tiered pavilion levels.",
        "significance": "UNESCO World Heritage Site since 2014. Features over 500 principal sculptures and a thousand minor ones of religious, mythological and secular imagery in Maru-Gurjara style.",
        "sources": "UNESCO World Heritage Centre (Ref: 922); ASI Vadodara Circle; Kirit Mankodi, 'The Queen's Stepwell at Patan', 1991.",
        "documents": [
            {
                "title": "Subterranean Hydraulic Architecture of Gujarat",
                "file_type": "PDF",
                "original_filename": "mankodi_rani_ki_vav.pdf",
                "extracted_text": "Stepped corridors descend 28 meters to water level, structured with trabeate pillars and beams sculpted with avatars of Vishnu.",
            }
        ],
        "images": [
            {"image_url": "https://images.unsplash.com/photo-1609137144813-7d9921338f24?q=80&w=800", "caption": "Tiered pavilion galleries and sculpted pillared corridors"},
        ]
    }
]


def seed_database(db: Session) -> int:
    """
    Seeds initial Indian heritage sites if the database table is empty.
    Avoids duplicate insertion on restarts.
    """
    existing_count = db.query(HeritageSite).count()
    if existing_count > 0:
        logger.info(f"Database already populated with {existing_count} heritage sites. Skipping seed.")
        return existing_count

    logger.info("Database is empty. Seeding initial Indian heritage sites...")
    created_count = 0

    for site_dict in SEED_SITES:
        docs_data = list(site_dict.get("documents", []))
        images_data = list(site_dict.get("images", []))
        site_data = {k: v for k, v in site_dict.items() if k not in ("documents", "images")}

        site = HeritageSite(**site_data)
        db.add(site)
        db.flush()  # Populates site.id

        for doc_dict in docs_data:
            doc = ArchivalDocument(site_id=site.id, **doc_dict)
            db.add(doc)

        for img_dict in images_data:
            img = SiteImage(site_id=site.id, **img_dict)
            db.add(img)

        created_count += 1

    db.commit()
    logger.info(f"Successfully seeded {created_count} heritage sites with associated documents and galleries.")
    return created_count
