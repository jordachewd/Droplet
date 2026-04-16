import Link from "next/link";

export default async function DesignPage() {
  return (
    <div className="relative z-10 my-10 mx-auto flex w-full flex-1 flex-col items-center gap-20">
      <div className="flex flex-col w-full gap-6">
        <h5 className="heading-5 flex mx-auto w-full max-w-screen-2xl">
          Typography
        </h5>
        <hr />
        <div className="flex flex-col mx-auto w-full max-w-screen-2xl gap-6">
          <h1 className="heading-1">Heading 1</h1>
          <h2 className="heading-2">Heading 2</h2>
          <h3 className="heading-3">Heading 3</h3>
          <h4 className="heading-4">Heading 4</h4>
          <h5 className="heading-5">Heading 5</h5>
          <h6 className="heading-6">Heading 6</h6>

          <p className="body-1">
            <b>Body1 - Paragraph</b> Lorem ipsum dolor sit amet, consectetuer
            adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum
            sociis natoque penatibus et magnis dis parturient montes, nascetur
            ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu,
            pretium quis, sem. Nulla consequat massa quis enim. Donec pede
            justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim
            justo, rhoncus ut, imperdiet a, venenatis vitae, justo. Nullam
            dictum felis eu pede mollis pretium. Integer tincidunt. Cras
            dapibus. Vivamus elementum semper nisi. Aenean vulputate eleifend
            tellus.
          </p>

          <p className="body-2">
            <b>Body2 - Paragraph</b> Aenean leo ligula, porttitor eu, consequat
            vitae, eleifend ac, enim. Aliquam lorem ante, dapibus in, viverra
            quis, feugiat a, tellus. Phasellus viverra nulla ut metus varius
            laoreet. Quisque rutrum. Aenean imperdiet. Etiam ultricies nisi vel
            augue. Curabitur ullamcorper ultricies nisi. Nam eget dui. Etiam
            rhoncus. Maecenas tempus, tellus eget condimentum rhoncus, sem quam
            semper libero, sit amet adipiscing sem neque sed ipsum. Nam quam
            nunc, blandit vel, luctus pulvinar, hendrerit id, lorem. Maecenas
            nec odio et ante tincidunt tempus. Donec vitae sapien ut libero
            venenatis faucibus. Nullam quis ante. Etiam sit amet orci eget eros
            faucibus tincidunt. Duis leo. Sed fringilla mauris sit amet nibh.
            Donec sodales sagittis magna. Sed consequat, leo eget bibendum
            sodales, augue velit cursus nunc,
          </p>
        </div>
      </div>

      <div className="flex flex-col w-full gap-6">
        <h5 className="heading-5 flex mx-auto w-full max-w-screen-2xl">
          Buttons
        </h5>
        <hr />

        <div className="flex mx-auto w-full max-w-screen-2xl items-center gap-6">
          <Link className="btn btn-xs btn-text" href="/">
            Text Xs
          </Link>
          <Link className="btn btn-sm btn-text" href="/">
            Text sm
          </Link>

          <Link className="btn btn-text" href="/">
            Text Default
          </Link>

          <Link className="btn btn-md btn-text" href="/">
            Text md
          </Link>
          <Link className="btn btn-lg btn-text" href="/">
            Text lg
          </Link>
        </div>

        <div className="flex mx-auto w-full max-w-screen-2xl items-center gap-6">
          <Link className="btn btn-xs btn-outlined" href="/">
            outlined Xs
          </Link>
          <Link className="btn btn-sm btn-outlined" href="/">
            outlined sm
          </Link>

          <Link className="btn btn-outlined" href="/">
            outlined Default
          </Link>

          <Link className="btn btn-md btn-outlined" href="/">
            outlined md
          </Link>
          <Link className="btn btn-lg btn-outlined" href="/">
            outlined lg
          </Link>
        </div>

        <div className="flex mx-auto w-full max-w-screen-2xl items-center gap-6">
          <Link className="btn btn-xs btn-contained" href="/">
            contained Xs
          </Link>
          <Link className="btn btn-sm btn-contained" href="/">
            contained sm
          </Link>

          <Link className="btn btn-contained" href="/">
            contained Default
          </Link>

          <Link className="btn btn-md btn-contained" href="/">
            contained md
          </Link>
          <Link className="btn btn-lg btn-contained" href="/">
            contained lg
          </Link>
        </div>

        <div className="flex mx-auto w-full max-w-screen-2xl items-center gap-6">
          <Link className="btn btn-xs btn-danger" href="/">
            danger Xs
          </Link>
          <Link className="btn btn-sm btn-danger" href="/">
            danger sm
          </Link>

          <Link className="btn btn-danger" href="/">
            danger Default
          </Link>

          <Link className="btn btn-md btn-danger" href="/">
            danger md
          </Link>
          <Link className="btn btn-lg btn-danger" href="/">
            danger lg
          </Link>
        </div>

        <div className="flex mx-auto w-full max-w-screen-2xl items-center gap-6">
          <Link className="btn btn-xs btn-hero" href="/">
            Hero Xs
          </Link>
          <Link className="btn btn-sm btn-hero" href="/">
            Hero sm
          </Link>

          <Link className="btn btn-hero" href="/">
            Hero Default
          </Link>

          <Link className="btn btn-md btn-hero" href="/">
            Hero md
          </Link>
          <Link className="btn btn-lg btn-hero" href="/">
            Hero lg
          </Link>
        </div>

        <div className="flex mx-auto w-full max-w-screen-2xl">
          <Link className="icon-btn" href="/">
            <i className="bi bi-basket3"></i>
          </Link>
        </div>
      </div>

      <div className="flex flex-col w-full gap-6">
        <h5 className="heading-5 flex mx-auto w-full max-w-screen-2xl">
          Forms &amp; Inputs
        </h5>
        <hr />

        <div className="flex flex-col mx-auto w-full max-w-screen-2xl gap-10">
          <div className="flex flex-col gap-2">
            <h6 className="heading-6">Text-like Inputs</h6>
            <code>.form-text-input</code>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 my-4">
              <div className="form-field">
                <label className="form-label">Text</label>
                <input
                  type="text"
                  className="form-text-input"
                  placeholder="Text input"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-text-input"
                  placeholder="email@example.com"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="form-text-input"
                  placeholder="••••••••"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Number</label>
                <input
                  type="number"
                  className="form-text-input"
                  placeholder="42"
                />
              </div>
              <div className="form-field">
                <label className="form-label">URL</label>
                <input
                  type="url"
                  className="form-text-input"
                  placeholder="https://example.com"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Tel</label>
                <input
                  type="tel"
                  className="form-text-input"
                  placeholder="+1 555-0123"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Search</label>
                <input
                  type="search"
                  className="form-text-input form-search-input"
                  placeholder="Search…"
                />
              </div>
              <div className="form-field">
                <label className="form-label">Date</label>
                <input type="date" className="form-text-input" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h6 className="heading-6">Disabled Text Input</h6>
            <div className="max-w-sm my-4">
              <div className="form-field">
                <label className="form-label">Disabled</label>
                <input
                  type="text"
                  className="form-text-input"
                  placeholder="Cannot edit"
                  disabled
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h6 className="heading-6">Textarea</h6>
            <code>.form-textarea-input</code>
            <div className="max-w-lg my-4">
              <div className="form-field">
                <label className="form-label">Message</label>
                <textarea
                  className="form-textarea-input"
                  rows={4}
                  placeholder="Write something…"
                />
                <span className="form-helper-text">
                  Helper text below the textarea.
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h6 className="heading-6">Select</h6>
            <code>.form-select-input</code>
            <div className="max-w-sm my-4">
              <div className="form-field">
                <label className="form-label">Choose an option</label>
                <select className="form-select-input" defaultValue="">
                  <option value="" disabled>
                    Select…
                  </option>
                  <option value="a">Option A</option>
                  <option value="b">Option B</option>
                  <option value="c">Option C</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h6 className="heading-6">File </h6>
            <code>.form-file-input</code>
            <div className="max-w-md my-4">
              <div className="form-field">
                <label className="form-label">Upload a file</label>
                <input type="file" className="form-file-input" />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h6 className="heading-6">Checkbox &amp; Radio</h6>
            <code>.form-checkbox-input</code>
            <code>.form-radio-input</code>
            <div className="flex flex-wrap gap-16 my-4">
              <fieldset className="flex flex-col gap-2">
                <legend className="form-label mb-1">Checkboxes</legend>
                <label className="form-field-inline">
                  <input
                    type="checkbox"
                    className="form-checkbox-input"
                    defaultChecked
                  />
                  <span>Checked</span>
                </label>
                <label className="form-field-inline">
                  <input type="checkbox" className="form-checkbox-input" />
                  <span>Unchecked</span>
                </label>
                <label className="form-field-inline">
                  <input
                    type="checkbox"
                    className="form-checkbox-input"
                    disabled
                  />
                  <span>Disabled</span>
                </label>
              </fieldset>

              <fieldset className="flex flex-col gap-2">
                <legend className="form-label mb-1">Radio buttons</legend>
                <label className="form-field-inline">
                  <input
                    type="radio"
                    name="demo-radio"
                    className="form-radio-input"
                    defaultChecked
                  />
                  <span>Option 1</span>
                </label>
                <label className="form-field-inline">
                  <input
                    type="radio"
                    name="demo-radio"
                    className="form-radio-input"
                  />
                  <span>Option 2</span>
                </label>
                <label className="form-field-inline">
                  <input
                    type="radio"
                    name="demo-radio"
                    className="form-radio-input"
                    disabled
                  />
                  <span>Disabled</span>
                </label>
              </fieldset>
            </div>
          </div>

          
          <div className="flex flex-col gap-2">
            <h6 className="heading-6">Range</h6>
            <code>.form-range-input</code>
            <div className="max-w-sm my-4">
              <div className="form-field">
                <label className="form-label">Volume</label>
                <input
                  type="range"
                  className="form-range-input"
                  min={0}
                  max={100}
                  defaultValue={50}
                />
              </div>
            </div>
          </div>

         
          <div className="flex flex-col gap-2">
            <h6 className="heading-6">Chat Textarea</h6>
            <code>.form-chat-textarea</code>
            <div className="max-w-lg my-4">
              <textarea
                className="form-chat-textarea"
                rows={3}
                placeholder="Type a message…"
              />
            </div>
          </div>

         
          <div className="flex flex-col gap-2">
            <h6 className="heading-6">Helper Text</h6>
            <code>.form-helper-text</code>
            <div className="max-w-sm my-4">
              <div className="form-field">
                <label className="form-label">With helper</label>
                <input
                  type="text"
                  className="form-text-input"
                  placeholder="Enter value"
                />
                <span className="form-helper-text">
                  This is a helper / hint message.
                </span>
              </div>
            </div>
          </div>

          
          <div className="flex flex-col gap-2">
            <h6 className="heading-6">Admin Label</h6>
            <code>.admin-label</code>
            <span className="admin-label my-4">Admin Label Text</span>
          </div>

          
          <div className="flex flex-col gap-2">
            <h6 className="heading-6">Admin Form Surface</h6>
            <code>.admin-form-surface</code>
            <div className="admin-form-surface max-w-lg my-4">
              <div className="form-field">
                <label className="form-label">Field inside surface</label>
                <input
                  type="text"
                  className="form-text-input"
                  placeholder="Surface demo"
                />
                <span className="form-helper-text">
                  Wrapped in .admin-form-surface
                </span>
              </div>
              <div className="form-field">
                <label className="form-label">Another field</label>
                <select className="form-select-input" defaultValue="a">
                  <option value="a">Option A</option>
                  <option value="b">Option B</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
