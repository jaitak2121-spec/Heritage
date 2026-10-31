import unittest
from app.database import engine, Base, SessionLocal
from app.services.seed import seed_database
from app.routers.sites import get_sites, get_site, create_site, update_site, delete_site
from app.routers.map import get_map_markers
from app.schemas.site import HeritageSiteCreate, HeritageSiteUpdate


class TestHeritageLensBackend(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.db = SessionLocal()
        seed_database(cls.db)

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_get_sites_all(self):
        sites = get_sites(search=None, period=None, style=None, region=None, skip=0, limit=50, db=self.db)
        self.assertGreaterEqual(len(sites), 10)
        first = sites[0]
        self.assertTrue(hasattr(first, "name"))
        self.assertTrue(hasattr(first, "document_count"))
        self.assertTrue(hasattr(first, "image_count"))
        print(f"✓ test_01_get_sites_all passed: found {len(sites)} sites")

    def test_02_search_sites(self):
        # Test search with query parameter q (used by frontend)
        konark_results_q = get_sites(q="Konark", db=self.db)
        self.assertGreaterEqual(len(konark_results_q), 1)
        self.assertIn("Konark", konark_results_q[0].name)

        # Test search with alternate parameter search
        konark_results_search = get_sites(search="Konark", db=self.db)
        self.assertGreaterEqual(len(konark_results_search), 1)
        self.assertIn("Konark", konark_results_search[0].name)
        print(f"✓ test_02_search_sites passed: {konark_results_q[0].name} (tested with 'q' and 'search')")

    def test_03_filter_by_region(self):
        south_results = get_sites(search=None, period=None, style=None, region="South", skip=0, limit=50, db=self.db)
        self.assertGreaterEqual(len(south_results), 1)
        for s in south_results:
            self.assertEqual(s.region, "South")
        print(f"✓ test_03_filter_by_region passed: found {len(south_results)} South Indian sites")

    def test_04_get_site_detail(self):
        site = get_site(site_id=1, db=self.db)
        self.assertIsNotNone(site)
        self.assertEqual(site.id, 1)
        self.assertGreaterEqual(len(site.documents), 1)
        self.assertGreaterEqual(len(site.images), 1)
        print(f"✓ test_04_get_site_detail passed: {site.name} has {len(site.documents)} docs and {len(site.images)} images")

    def test_05_map_markers(self):
        markers = get_map_markers(db=self.db)
        self.assertGreaterEqual(len(markers), 10)
        first = markers[0]
        self.assertTrue(hasattr(first, "latitude"))
        self.assertTrue(hasattr(first, "longitude"))
        self.assertIsInstance(first.latitude, float)
        self.assertIsInstance(first.longitude, float)
        print(f"✓ test_05_map_markers passed: returned {len(markers)} map markers")

    def test_06_crud_site_lifecycle(self):
        # 1. Create
        new_site_in = HeritageSiteCreate(
            name="Fatehpur Sikri",
            historical_period="Mughal Era",
            architectural_style="Indo-Islamic",
            region="North",
            location_name="Agra, Uttar Pradesh",
            latitude=27.0945,
            longitude=77.6679,
            image_url="https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=800",
            description="Royal city constructed by Mughal Emperor Akbar between 1571 and 1585.",
            significance="UNESCO World Heritage Site designated in 1986.",
            sources="UNESCO Ref: 255; ASI Agra Circle Records."
        )
        created = create_site(site_in=new_site_in, db=self.db)
        self.assertIsNotNone(created.id)
        created_id = created.id
        print(f"✓ test_06_create passed: site ID {created_id} created")

        # 2. Update
        update_in = HeritageSiteUpdate(description="Updated historical summary for Fatehpur Sikri complex.")
        updated = update_site(site_id=created_id, site_in=update_in, db=self.db)
        self.assertEqual(updated.description, "Updated historical summary for Fatehpur Sikri complex.")
        print(f"✓ test_06_update passed: site ID {created_id} updated")

        # 3. Delete
        del_res = delete_site(site_id=created_id, db=self.db)
        self.assertEqual(del_res["id"], created_id)
        print(f"✓ test_06_delete passed: site ID {created_id} deleted")


if __name__ == "__main__":
    unittest.main()
