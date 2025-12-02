// DocSubCatTable.test.jsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DocSubCatTable from "./DocSubCatTable";

// --- MOCKS ---
// We mock external dependencies to isolate our component for testing.

// Mock SweetAlert2 to prevent actual popups and to spy on calls.
vi.mock("sweetalert2", () => ({
  fire: vi.fn(),
}));

// Mock the IP address file to control the API URL.
vi.mock("../Datafetching/IPAdrees", () => ({
  IPAdress: "http://test-api.com",
}));

// Mock the ReusableDataGrid to simplify our test. We only care that it's rendered.
vi.mock("../Datafetching/ReusableDataGrid", () => ({
  default: ({ data }) => (
    <div data-testid="data-grid">
      {data.map((row) => (
        <div key={row.docsubcatrecid}>{row.docsubcatname}</div>
      ))}
    </div>
  ),
}));

// Mock sessionStorage to control user session data.
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, "sessionStorage", {
  value: mockSessionStorage,
});

// --- TEST SUITE ---
describe("DocSubCatTable Component", () => {
  // This function runs before each test, ensuring a clean slate.
  beforeEach(() => {
    // Clear all previous mock data.
    vi.clearAllMocks();

    // Set up default sessionStorage values for our tests.
    mockSessionStorage.getItem.mockImplementation((key) => {
      if (key === "userid") return "1";
      if (key === "token") return "test-token";
      if (key === "incuserid") return "inc-user-id";
      return null;
    });

    // Set up a default fetch mock. It returns an empty list of subcategories.
    // Individual tests can override this mock for specific scenarios.
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      })
    );
  });

  // --- TESTS ---

  it('renders the component title and "Add" button', async () => {
    render(<DocSubCatTable />);

    // Wait for the component to finish loading and rendering.
    await waitFor(() => {
      expect(screen.getByText("📂 Document Subcategories")).toBeInTheDocument();
      expect(screen.getByText("+ Add Subcategory")).toBeInTheDocument();
    });
  });

  it('opens the "Add Subcategory" modal when the button is clicked', async () => {
    const user = userEvent.setup();
    render(<DocSubCatTable />);

    // Wait for the initial render before interacting.
    await waitFor(() => {
      expect(screen.getByText("+ Add Subcategory")).toBeInTheDocument();
    });

    // Simulate a user clicking the "Add" button.
    const addButton = screen.getByText("+ Add Subcategory");
    await user.click(addButton);

    // Check if the modal title appears, confirming the modal is open.
    await waitFor(() => {
      expect(screen.getByText("Add Subcategory")).toBeInTheDocument();
    });
  });

  it("displays subcategories when data is fetched successfully", async () => {
    // Arrange: Define the data we want our component to receive.
    const mockSubcategories = [
      {
        docsubcatrecid: "1",
        doccatname: "Test Category",
        docsubcatname: "Test Subcategory",
        docsubcatdescription: "Test Description",
      },
    ];

    // Override the default fetch mock to return our specific test data.
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockSubcategories }),
      })
    );

    render(<DocSubCatTable />);

    // Assert: Check if the data from our mock is rendered on the screen.
    await waitFor(() => {
      expect(screen.getByTestId("data-grid")).toBeInTheDocument();
      expect(screen.getByText("Test Subcategory")).toBeInTheDocument();
    });
  });

  it("should submit the form with new subcategory data", async () => {
    const user = userEvent.setup();
    render(<DocSubCatTable />);

    // 1. Open the modal
    const addButton = screen.getByText("+ Add Subcategory");
    await user.click(addButton);

    await waitFor(() => {
      expect(screen.getByLabelText("Category *")).toBeInTheDocument();
    });

    // 2. Fill out the form fields
    const categorySelect = screen.getByLabelText("Category *");
    await user.selectOptions(categorySelect, "1"); // Assumes '1' is an option value

    const nameInput = screen.getByLabelText("Subcategory Name");
    await user.clear(nameInput); // Clear default value if any
    await user.type(nameInput, "New Test Subcategory");

    const descriptionInput = screen.getByLabelText("Description");
    await user.clear(descriptionInput);
    await user.type(descriptionInput, "A new test description");

    // 3. Mock the API call for adding a subcategory
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            statusCode: 200,
            message: "Subcategory added successfully",
          }),
      })
    );

    // 4. Click the "Save" button
    const saveButton = screen.getByText("Save");
    await user.click(saveButton);

    // 5. Verify that the fetch API was called (optional but good practice)
    expect(fetch).toHaveBeenCalled();
  });

  it("should show delete confirmation when delete button is clicked", async () => {
    const { fire } = await import("sweetalert2"); // Get the mocked function

    // Arrange: Provide some data so a delete button appears
    const mockSubcategories = [
      { docsubcatrecid: "1", docsubcatname: "Item to Delete" },
    ];
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockSubcategories }),
      })
    );

    const user = userEvent.setup();
    render(<DocSubCatTable />);

    // Wait for the item to be rendered
    await waitFor(() => {
      expect(screen.getByText("Item to Delete")).toBeInTheDocument();
    });

    // Act: Find and click the delete button
    // FIXED: Using getByRole with name option instead of getByTitle
    const deleteButton = screen.getByRole("button", { name: /delete/ });
    await user.click(deleteButton);

    // Assert: Check if SweetAlert2 confirmation was triggered with the correct text.
    expect(fire).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Are you sure?",
        text: "This subcategory will be deleted permanently.",
      })
    );
  });
});
